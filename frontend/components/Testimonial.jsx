"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";
import { Star, ChevronLeft, ChevronRight, Quote, Sparkles } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { api } from "@/lib/api";
import LoaderCard from "@/components/ui/loader";
import { getImageUrl } from "@/lib/utils";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function Testimonial() {
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await api.getTestimonials();
        setTestimonials(response.testimonials || []);
      } catch (error) {
        console.error("Error fetching testimonials:", error);
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  if (loading) {
    return (
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoaderCard message="Loading testimonials…" />
          </div>
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) return null;

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/40 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100/40 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 xl:gap-24">
          {/* Left Content */}
          <div className="w-full lg:w-1/3 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-[0.2em] mb-8 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Testimonials
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-[1.1] mb-8">
              Voices of our <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                Creative Community
              </span>
            </h2>
            <p className="text-gray-600 mb-12 text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
              Discover why thousands of writers trust BlogerMenia to share their stories and build their digital legacy.
            </p>

            {/* Slider Controls */}
            <div className="flex items-center justify-center lg:justify-start gap-4">
              <button
                ref={prevRef}
                className="group flex justify-center items-center border border-gray-100 bg-white/80 backdrop-blur-md w-14 h-14 transition-all duration-300 rounded-2xl hover:border-indigo-600 hover:bg-indigo-600 shadow-lg hover:shadow-indigo-200"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" />
              </button>
              <button
                ref={nextRef}
                className="group flex justify-center items-center border border-gray-100 bg-white/80 backdrop-blur-md w-14 h-14 transition-all duration-300 rounded-2xl hover:border-indigo-600 hover:bg-indigo-600 shadow-lg hover:shadow-indigo-200"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Swiper Area */}
          <div className="w-full lg:w-2/3">
            <Swiper
              modules={[Navigation, Autoplay, Pagination]}
              spaceBetween={30}
              slidesPerView={1}
              loop={testimonials.length > 2}
              autoplay={{
                delay: 6000,
                disableOnInteraction: false,
              }}
              pagination={{
                clickable: true,
                dynamicBullets: true,
                bulletActiveClass: 'swiper-pagination-bullet-active-custom',
              }}
              onBeforeInit={(swiper) => {
                swiper.params.navigation.prevEl = prevRef.current;
                swiper.params.navigation.nextEl = nextRef.current;
              }}
              breakpoints={{
                640: { slidesPerView: 1 },
                768: { slidesPerView: 2 },
                1024: { slidesPerView: 2 },
              }}
              className="testimonial-swiper !pb-16"
            >
              <style jsx global>{`
                .testimonial-swiper .swiper-pagination-bullet-active-custom {
                  background: #4f46e5 !important;
                  width: 24px !important;
                  border-radius: 9999px !important;
                  transition: all 0.3s ease;
                }
              `}</style>
              {testimonials.map((testimonial, index) => {
                const name = testimonial.author || testimonial.name || "Anonymous";
                const designation = testimonial.designation || testimonial.role || "Creator";
                const content = testimonial.content || testimonial.text || "";
                const image = testimonial.image || testimonial.profile_image;

                return (
                  <SwiperSlide key={index} className="h-auto">
                    <div className="bg-white/80 backdrop-blur-xl border border-white rounded-2xl p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] h-full flex flex-col relative group transition-all duration-500 hover:shadow-[0_20px_50px_rgba(79,70,229,0.1)] hover:-translate-y-2 border-t-2 hover:border-t-indigo-500">
                      <div className="absolute top-10 right-10 text-indigo-600/10 group-hover:text-indigo-600/20 transition-colors">
                        <Quote className="w-16 h-16 fill-current" />
                      </div>

                      <div className="flex items-center gap-5 mb-10">
                        <div className="relative">
                          <div className="absolute inset-0 bg-indigo-400 rounded-2xl blur-md opacity-20 scale-110 group-hover:scale-125 transition-transform duration-500"></div>
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border-2 border-white shadow-md relative z-10 shrink-0">
                            <img
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              src={image ? getImageUrl(image?.file_path || image) : `https://ui-avatars.com/api/?name=${name}&background=random`}
                              alt={name}
                            />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-gray-900 font-bold text-lg mb-1 truncate">
                            {name}
                          </h5>
                          <div className="inline-block px-2.5 py-0.5 rounded-lg bg-indigo-50 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                            {designation}
                          </div>
                        </div>
                      </div>

                      <div className="flex-grow relative">
                        <p className="text-gray-600 leading-[1.8] italic text-lg mb-10 relative z-10 font-medium">
                          "{content}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-current animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                          ))}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Verified Creator
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        </div>
      </div>
    </section>
  );
}
