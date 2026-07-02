import functools
from importlib.resources import files
from dicebear import Avatar, Style

@functools.cache
def get_avatar_style(style_name="lorelei"):
    return Style.from_json(
        files("dicebear_styles").joinpath(f"{style_name}.json").read_text("utf-8")
    )

def generate_avatar(seed, style_name="lorelei"):
    style = get_avatar_style(style_name)
    avatar = Avatar(style, {"seed": str(seed)})
    return avatar.to_string()
