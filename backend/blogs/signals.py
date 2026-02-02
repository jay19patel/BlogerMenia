from django.db.models.signals import pre_save
from django.dispatch import receiver
from blogs.models import Blog
from django.conf import settings
from langchain_mistralai import MistralAIEmbeddings
import logging

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Blog)
def create_blog_embedding(sender, instance, **kwargs):
    """
    Generate embeddings for Blog before saving.
    Fields used: Title, Subtitle, Category, Excerpt, Introduction, Conclusion
    """
    # Check if essential fields are present
    if not instance.title:
        return

    # Check if embedding already exists and content hasn't changed significantly? 
    # For now, we regenerate if any of the key fields changed. 
    # But pre_save doesn't easily give old instance unless we fetch it.
    
    # In a production app, we should check specifically if fields changed to save API calls.
    # Here, for simplicity/correctness according to user request, we generate it.
    
    try:
        # Construct text for embedding
        # "Title Subtitle Category Excerpt Introduction Conclusion"
        category_name = instance.category.name if instance.category else ""
        
        parts = [
            instance.title or "",
            instance.subtitle or "",
            category_name,
            instance.excerpt or "",
            instance.introduction or "",
            instance.conclusion or ""
        ]
        
        text_to_embed = " ".join([p for p in parts if p])
        
        if not text_to_embed.strip():
            return

        # Initialize Embeddings model
        embeddings = MistralAIEmbeddings(
            api_key=settings.MISTRAL_API_KEY,
            model="mistral-embed" 
        )
        
        # Generate embedding
        # MistralAIEmbeddings.embed_query returns List[float]
        vector = embeddings.embed_query(text_to_embed)
        
        # Save to instance
        instance.embedding = vector
        
    except Exception as e:
        logger.error(f"Error generating embedding for blog {instance.title}: {e}")
        # Don't stop the save if embedding fails, but log it
