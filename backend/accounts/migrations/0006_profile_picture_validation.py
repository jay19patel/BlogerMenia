from django.db import migrations, models

import core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_customuser_auto_post_to_linkedin'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='profile_picture',
            field=models.ImageField(
                blank=True, null=True, upload_to='profile_pics/',
                validators=[core.validators.validate_image],
            ),
        ),
    ]
