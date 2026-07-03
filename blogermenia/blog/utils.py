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
    svg = avatar.to_string()
    # Make the SVG stretch to fully fill its container (no crop, no gaps),
    # so it fits any div shape in the blog/playlist covers.
    return svg.replace(
        "<svg ",
        '<svg preserveAspectRatio="none" width="100%" height="100%" style="width:100%;height:100%;display:block" ',
        1,
    )
