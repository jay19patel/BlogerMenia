# from django.db.models.signals import post_save
# from django.dispatch import receiver
# from blogs.models import Blog
# from openai import OpenAI
# from pinecone import Pinecone
# from django.conf import settings

# @receiver(post_save, sender=Blog)
# def create_blog_embedding(sender, instance, created, **kwargs):
#     # Only create embedding on first save (creation time)
#     if not created:
#         return
    
#     client = OpenAI(api_key=settings.OPENAI_API_KEY)
#     pc = Pinecone(api_key=settings.PINECONE_API_KEY)
#     index = pc.Index("blogs-index")

#     # Text to embed
#     text = f"{instance.title} {instance.subtitle or ''} {instance.excerpt or ''}"

#     # Create embedding
#     response = client.embeddings.create(
#         model="text-embedding-3-small",
#         input=text
#     )
#     vector = response.data[0].embedding

#     # Pinecone upload
#     index.upsert([
#         {
#             "id": str(instance.id),
#             "values": vector,
#             "metadata": {
#                 "slug": instance.slug,
#                 "title": instance.title
#             }
#         }
#     ])
