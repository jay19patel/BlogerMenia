import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        await connectToDatabase();

        const user = await User.findOne({ email: credentials.email }).select('+password');

        if (!user) {
          throw new Error("No user found with this email");
        }

        if (!user.password) {
          throw new Error("User registered through Google. Please use Google Login.");
        }

        const isPasswordMatch = await user.comparePassword(credentials.password);

        if (!isPasswordMatch) {
          throw new Error("Invalid password");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.full_name || user.email.split('@')[0],
          role: user.role,
          image: user.profile_image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 Days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        await connectToDatabase();
        
        // Check if user exists
        const existingUser = await User.findOne({ email: user.email });
        
        if (!existingUser) {
          // Create new user for Google login
          const newUser = await User.create({
            email: user.email,
            full_name: user.name,
            username: user.email.split('@')[0],
            googleId: profile.sub,
            profile_image: user.image,
          });
          user.id = newUser._id.toString();
          user.role = newUser.role;
        } else {
          user.id = existingUser._id.toString();
          user.role = existingUser.role;
          
          // Link google id if not linked
          if (!existingUser.googleId) {
            existingUser.googleId = profile.sub;
            await existingUser.save();
          }
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.picture = user.image;
      }
      // If user updates profile and calls update(), update the token
      if (trigger === 'update' && session?.profile_image !== undefined) {
        token.picture = session.profile_image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        // NextAuth defaults to 'name', but our UI expects 'full_name' and 'username'
        session.user.full_name = token.name;
        session.user.username = token.email ? token.email.split('@')[0] : '';
        session.user.profile_image = token.picture;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_development_only",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
