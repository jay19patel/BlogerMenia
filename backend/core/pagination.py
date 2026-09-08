"""Pagination.

DRF's default `PageNumberPagination` ignores `?page_size=`, which meant the
frontend's page-size requests were silently dropped and its page counts came out
wrong. `max_page_size` keeps that from becoming a way to ask for the whole table.
"""
from rest_framework import pagination


class PageNumberPagination(pagination.PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 100
