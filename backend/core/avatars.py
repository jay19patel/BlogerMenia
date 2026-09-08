"""DiceBear avatar generation.

Lives here rather than in `blog/` because `accounts` needs it too — an app
should not have to import from a sibling app to draw a placeholder.
"""
import functools
from importlib.resources import files

from dicebear import Avatar, Style


@functools.cache
def get_avatar_style(style_name: str = "lorelei") -> Style:
    return Style.from_json(
        files("dicebear_styles").joinpath(f"{style_name}.json").read_text("utf-8")
    )


@functools.lru_cache(maxsize=2048)
def generate_avatar(seed, style_name: str = "lorelei") -> str:
    """Deterministic SVG for `seed`. Cached — the same seed always renders the
    same avatar, and this runs once per object per serialization otherwise."""
    style = get_avatar_style(style_name)
    svg = Avatar(style, {"seed": str(seed)}).to_string()
    # Stretch to fully fill its container (no crop, no gaps) so it fits any
    # shape the frontend puts it in.
    return svg.replace(
        "<svg ",
        '<svg preserveAspectRatio="none" width="100%" height="100%" '
        'style="width:100%;height:100%;display:block" ',
        1,
    )
