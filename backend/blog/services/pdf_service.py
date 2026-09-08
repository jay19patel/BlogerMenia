"""Render a post to a real PDF, server-side.

There was no server-side PDF before this. `/blogs/<slug>/pdf/` on the frontend
is a print-styled page that calls `window.print()`, which produces a file inside
the reader's browser and leaves nothing behind — so there were no bytes to hand
to LinkedIn's document upload, and no single artifact that both the reader and
the share could be talking about. This module is that artifact.

ReportLab rather than an HTML-to-PDF engine on purpose: WeasyPrint would give
better fidelity to the web page but needs cairo and pango installed on every
machine that runs a worker. Posts are already structured section blocks, so
there is no HTML to reproduce — each block maps to a flowable directly.

Nothing here may raise on odd content. A post with a ragged table or a section
missing its fields still has to produce a PDF, because the alternative is a
LinkedIn share that silently never happens.
"""
import logging
from io import BytesIO
from typing import Any

from django.utils.html import escape, strip_tags
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

logger = logging.getLogger(__name__)

BRAND = colors.HexColor("#4338CA")
INK = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#64748B")
RULE = colors.HexColor("#E2E8F0")
WASH = colors.HexColor("#F8FAFC")

PDF_CACHE_TTL = 60 * 60

# A code block wider than this wraps mid-line rather than running off the page.
CODE_WRAP = 96
# Long code samples are for the article, not the shareable PDF.
CODE_MAX_LINES = 28
PAGE_WIDTH, _ = A4
CONTENT_WIDTH = PAGE_WIDTH - 36 * mm


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()["BodyText"]
    common = {"fontName": "Helvetica", "textColor": INK, "alignment": TA_LEFT}
    return {
        "title": ParagraphStyle(
            "pdfTitle", parent=base, fontName="Helvetica-Bold", fontSize=25,
            leading=30, textColor=INK, spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "pdfSubtitle", parent=base, fontSize=13, leading=18,
            textColor=MUTED, spaceAfter=14, fontName="Helvetica",
        ),
        "meta": ParagraphStyle(
            "pdfMeta", parent=base, fontSize=9, leading=13, textColor=MUTED,
            fontName="Helvetica",
        ),
        "heading": ParagraphStyle(
            "pdfHeading", parent=base, fontName="Helvetica-Bold", fontSize=14,
            leading=19, textColor=INK, spaceBefore=16, spaceAfter=6,
        ),
        "body": ParagraphStyle("pdfBody", parent=base, fontSize=10.5, leading=16, spaceAfter=8, **common),
        "note": ParagraphStyle(
            "pdfNote", parent=base, fontSize=10, leading=15, textColor=INK,
            fontName="Helvetica-Oblique", leftIndent=8, spaceAfter=4,
        ),
        "code": ParagraphStyle(
            "pdfCode", parent=base, fontName="Courier", fontSize=8,
            leading=11, textColor=INK, spaceAfter=0,
        ),
        "cell": ParagraphStyle("pdfCell", parent=base, fontSize=8.5, leading=12, **common),
        "cellHead": ParagraphStyle(
            "pdfCellHead", parent=base, fontName="Helvetica-Bold", fontSize=8.5,
            leading=12, textColor=colors.white, alignment=TA_LEFT,
        ),
        "caption": ParagraphStyle(
            "pdfCaption", parent=base, fontSize=8.5, leading=12, textColor=MUTED,
            fontName="Helvetica-Oblique", spaceAfter=10,
        ),
        "footer": ParagraphStyle(
            "pdfFooter", parent=base, fontSize=9, leading=13, textColor=MUTED,
            fontName="Helvetica",
        ),
    }


def _text(value: Any) -> str:
    """Plain author text, safe to drop into a ReportLab paragraph.

    Section bodies can hold HTML from the legacy editor, and ReportLab reads a
    small set of tags of its own — so tags are stripped and the result escaped,
    or a stray `<b` anywhere in a post aborts the whole render.
    """
    if value is None:
        return ""
    return escape(strip_tags(str(value))).replace("\n", "<br/>")


def _wrap_code(line: str) -> list[str]:
    if len(line) <= CODE_WRAP:
        return [line]
    return [line[index:index + CODE_WRAP] for index in range(0, len(line), CODE_WRAP)]


def _boxed(flowables: list[Any], background=WASH) -> Table:
    """One-cell table used as a tinted, bordered container."""
    table = Table([[flowables]], colWidths=[CONTENT_WIDTH])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return table


# --------------------------------------------------------------- per section


def _render_text(section, style) -> list[Any]:
    return [Paragraph(_text(section.get("content")), style["body"])]


def _render_note(section, style) -> list[Any]:
    body = Paragraph(_text(section.get("content")), style["note"])
    return [_boxed([body]), Spacer(1, 10)]


def _render_bullets(section, style) -> list[Any]:
    items = [str(item) for item in section.get("items") or [] if str(item).strip()]
    if not items:
        return []
    return [
        ListFlowable(
            [ListItem(Paragraph(_text(item), style["body"]), leftIndent=14) for item in items],
            bulletType="bullet", bulletFontSize=7, bulletColor=BRAND, leftIndent=12,
        ),
        Spacer(1, 8),
    ]


def _render_code(section, style) -> list[Any]:
    raw = str(section.get("content") or "")
    if not raw.strip():
        return []

    lines: list[str] = []
    for line in raw.split("\n"):
        lines.extend(_wrap_code(line.replace("\t", "    ")))

    truncated = len(lines) > CODE_MAX_LINES
    shown = lines[:CODE_MAX_LINES]

    body = [Paragraph(escape(line) or "&nbsp;", style["code"]) for line in shown]
    if truncated:
        body.append(Paragraph(
            f"… {len(lines) - CODE_MAX_LINES} more lines — read the full listing online.",
            style["caption"],
        ))

    language = str(section.get("language") or "").strip()
    header = [Paragraph(f"<b>{escape(language)}</b>", style["caption"])] if language else []
    return [_boxed(header + body), Spacer(1, 10)]


def _render_table(section, style) -> list[Any]:
    headers = [str(header) for header in section.get("headers") or []]
    rows = [row for row in section.get("rows") or [] if isinstance(row, list)]
    if not headers and not rows:
        return []

    # An author can leave a row short or long; ReportLab would raise on a
    # ragged grid, so every row is padded or clipped to the header count.
    width = len(headers) or max((len(row) for row in rows), default=0)
    if not width:
        return []

    def normalise(row: list[Any]) -> list[Any]:
        cells = [str(cell) for cell in row[:width]]
        return cells + [""] * (width - len(cells))

    data = []
    if headers:
        data.append([Paragraph(_text(header), style["cellHead"]) for header in normalise(headers)])
    for row in rows:
        data.append([Paragraph(_text(cell), style["cell"]) for cell in normalise(row)])

    table = Table(data, colWidths=[CONTENT_WIDTH / width] * width, repeatRows=1 if headers else 0)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND if headers else colors.white),
        ("ROWBACKGROUNDS", (0, 1 if headers else 0), (-1, -1), [colors.white, WASH]),
        ("GRID", (0, 0), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return [table, Spacer(1, 12)]


def _render_links(section, style) -> list[Any]:
    entries = []
    for link in section.get("links") or []:
        if not isinstance(link, dict):
            continue
        url = str(link.get("url") or "").strip()
        if not url:
            continue
        label = _text(link.get("text") or url)
        line = f'<link href="{escape(url)}" color="#4338CA">{label}</link>'
        description = _text(link.get("description"))
        if description:
            line += f" — {description}"
        entries.append(ListItem(Paragraph(line, style["body"]), leftIndent=14))

    if not entries:
        return []
    return [
        ListFlowable(entries, bulletType="bullet", bulletFontSize=7, bulletColor=BRAND, leftIndent=12),
        Spacer(1, 8),
    ]


def _render_flowchart(section, style) -> list[Any]:
    body: list[Any] = []
    for position, step in enumerate(section.get("steps") or [], start=1):
        if not isinstance(step, dict):
            continue
        title = _text(step.get("title"))
        description = _text(step.get("description"))
        line = f"<b>{position}. {title}</b>"
        if description:
            line += f" — {description}"
        body.append(Paragraph(line, style["body"]))

        for branch in step.get("branches") or []:
            if not isinstance(branch, dict):
                continue
            branch_line = f"&#8627; {_text(branch.get('title'))}"
            branch_description = _text(branch.get("description"))
            if branch_description:
                branch_line += f": {branch_description}"
            body.append(Paragraph(branch_line, style["caption"]))

    if not body:
        return []
    return [_boxed(body), Spacer(1, 12)]


def _render_youtube(section, style) -> list[Any]:
    video_id = str(section.get("videoId") or "").strip()
    label = _text(section.get("videoTitle") or section.get("title") or "Watch on YouTube")
    body = []
    if video_id:
        url = f"https://www.youtube.com/watch?v={video_id}"
        body.append(Paragraph(
            f'&#9654; <link href="{escape(url)}" color="#4338CA">{label}</link>', style["body"],
        ))
    description = _text(section.get("description"))
    if description:
        body.append(Paragraph(description, style["caption"]))
    if not body:
        return []
    return [_boxed(body), Spacer(1, 10)]


def _image_flowable(path: str, max_height: float = 92 * mm) -> Image | None:
    """Scale a local image into the text column. None if it cannot be read."""
    try:
        from reportlab.lib.utils import ImageReader

        reader = ImageReader(path)
        width, height = reader.getSize()
        if not width or not height:
            return None
        scale = min(CONTENT_WIDTH / width, max_height / height, 1.0)
        return Image(path, width=width * scale, height=height * scale)
    except Exception as exc:  # noqa: BLE001 — a missing image must not lose the PDF
        logger.info("PDF: skipping unreadable image %s (%s)", path, exc)
        return None


def _render_image(section, style) -> list[Any]:
    # Only files this server already holds. Fetching an author-supplied remote
    # URL from inside a task would make PDF rendering depend on someone else's
    # uptime, and this runs on the LinkedIn share path.
    body: list[Any] = []
    local = _local_media_path(section.get("imageUrl") or section.get("attachment"))
    if local:
        image = _image_flowable(local)
        if image:
            body.append(image)

    caption = _text(section.get("description") or section.get("caption"))
    if caption:
        body.append(Paragraph(caption, style["caption"]))
    if not body:
        return []
    return body + [Spacer(1, 6)]


def _render_excalidraw(section, style) -> list[Any]:
    # The diagram itself is an inline SVG; rendering it would need another
    # dependency, so the PDF carries its caption and the article carries the
    # drawing.
    caption = _text(section.get("caption") or section.get("description"))
    if not caption:
        return []
    return [_boxed([Paragraph(f"&#9634; {caption}", style["caption"])]), Spacer(1, 10)]


_RENDERERS = {
    "text": _render_text,
    "note": _render_note,
    "bullets": _render_bullets,
    "code": _render_code,
    "table": _render_table,
    "links": _render_links,
    "flowchart": _render_flowchart,
    "youtube": _render_youtube,
    "image": _render_image,
    "excalidraw": _render_excalidraw,
}


def _local_media_path(url: Any) -> str | None:
    """The on-disk path for one of our own media URLs, or None."""
    from pathlib import Path

    from django.conf import settings

    if not url:
        return None
    value = str(url)
    prefix = settings.MEDIA_URL
    if not value.startswith(prefix):
        return None
    path = Path(settings.MEDIA_ROOT) / value[len(prefix):]
    return str(path) if path.is_file() else None


# -------------------------------------------------------------------- document


def _page_furniture(canvas, document, footer: str) -> None:
    """The rule and page number drawn on every page."""
    canvas.saveState()
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.4)
    canvas.line(18 * mm, 16 * mm, PAGE_WIDTH - 18 * mm, 16 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    # Truncated with an ellipsis rather than sliced: a footer cut mid-word — or
    # worse, mid-URL — reads as a broken document.
    label = footer if len(footer) <= 95 else footer[:94].rstrip() + "…"
    canvas.drawString(18 * mm, 11 * mm, label)
    canvas.drawRightString(PAGE_WIDTH - 18 * mm, 11 * mm, str(document.page))
    canvas.restoreState()


def _cover(blog, style) -> list[Any]:
    story: list[Any] = [Paragraph(_text(blog.title), style["title"])]

    if blog.subtitle:
        story.append(Paragraph(_text(blog.subtitle), style["subtitle"]))

    author = blog.author.get_full_name() or blog.author.username
    meta = f"{escape(author)} &middot; {blog.created_at.strftime('%d %B %Y')}"
    if blog.category:
        meta += f" &middot; {escape(blog.category.name)}"
    story.append(Paragraph(meta, style["meta"]))

    tags = [str(tag).strip() for tag in (blog.tags or []) if str(tag).strip()]
    if tags:
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            " &middot; ".join(escape(tag) for tag in tags[:8]), style["meta"],
        ))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.6, color=RULE))
    story.append(Spacer(1, 12))

    cover = _local_media_path(blog.image.url if blog.image else None)
    if cover:
        image = _image_flowable(cover, max_height=70 * mm)
        if image:
            story.extend([image, Spacer(1, 12)])

    if blog.introduction:
        story.append(Paragraph(_text(blog.introduction), style["body"]))

    return story


def _closing(blog, style, blog_url: str) -> list[Any]:
    story: list[Any] = []
    if blog.conclusion:
        story.append(Paragraph("Conclusion", style["heading"]))
        story.append(Paragraph(_text(blog.conclusion), style["body"]))

    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.6, color=RULE))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f'Read this post online, with live code and diagrams: '
        f'<link href="{escape(blog_url)}" color="#4338CA">{escape(blog_url)}</link>',
        style["footer"],
    ))
    return story


def render_blog_pdf(blog) -> bytes:
    """The post as a PDF. Raises only if ReportLab itself cannot write a file."""
    style = _styles()
    blog_url = blog.get_absolute_url()

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=22 * mm,
        title=blog.title,
        author=blog.author.get_full_name() or blog.author.username,
        subject=blog.excerpt or blog.subtitle or "",
    )

    story = _cover(blog, style)

    for section in blog.sections or []:
        if not isinstance(section, dict):
            continue

        heading = str(section.get("title") or "").strip()
        renderer = _RENDERERS.get(str(section.get("type") or "text"), _render_text)
        try:
            body = renderer(section, style)
        except Exception as exc:  # noqa: BLE001 — one bad block must not lose the PDF
            logger.warning("PDF: skipping %r section: %s", section.get("type"), exc)
            continue

        if not heading and not body:
            continue

        block: list[Any] = []
        if heading:
            block.append(Paragraph(_text(heading), style["heading"]))
        block.extend(body)

        # Keep a heading with the start of what it introduces; a long block is
        # left to flow so it never overflows a page on its own.
        if len(block) <= 3:
            story.append(KeepTogether(block))
        else:
            story.extend(block)

    if not blog.sections and blog.content:
        story.append(Paragraph(_text(blog.content), style["body"]))

    story.extend(_closing(blog, style, blog_url))

    def furniture(canvas, doc):
        _page_furniture(canvas, doc, blog.title)

    document.build(story, onFirstPage=furniture, onLaterPages=furniture)
    return buffer.getvalue()


def pdf_filename(blog) -> str:
    return f"{blog.slug or 'post'}.pdf"


def blog_pdf(blog) -> bytes:
    """`render_blog_pdf`, memoised on the post's current revision.

    Both the download endpoint and the LinkedIn share ask for this, and the
    render is CPU-bound — so the author who reviews the PDF and then shares it
    pays for one render, not two. Keying on `updated_at` makes the entry
    self-invalidating: an edit moves the timestamp and orphans the old bytes.
    """
    import hashlib

    from django.core.cache import cache

    revision = hashlib.sha256(
        f"{blog.pk}:{blog.updated_at.isoformat()}".encode()
    ).hexdigest()[:32]
    key = f"blog-pdf:{revision}"

    cached = cache.get(key)
    if cached is not None:
        return cached

    data = render_blog_pdf(blog)
    cache.set(key, data, PDF_CACHE_TTL)
    return data
