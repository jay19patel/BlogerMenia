"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { api } from "@/lib/api";
import LoaderCard from "@/components/ui/loader";
import { getImageUrl } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";

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
      <section className="py-20 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-80">
            <LoaderCard message="Fetching feedback data…" />
          </div>
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) return null;

  return (
    <section className="py-20 border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <span className="inline-flex items-center bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium mb-4">
              Reviews
            </span>
            <h2 className="text-3xl font-bold text-foreground">
              What Our Users Say
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
              Reviews and feedback from writers and readers who use BlogerMenia every day.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <Button ref={prevRef} variant="outline" size="icon" aria-label="Previous testimonial">
              <ChevronLeft className="size-4" />
            </Button>
            <Button ref={nextRef} variant="outline" size="icon" aria-label="Next testimonial">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Swiper */}
        <div className="w-full">
          <Swiper
            modules={[Navigation, Autoplay, Pagination]}
            spaceBetween={20}
            slidesPerView={1}
            loop={testimonials.length > 2}
            autoplay={{ delay: 6000, disableOnInteraction: false }}
            pagination={{ clickable: true, dynamicBullets: true }}
            onBeforeInit={(swiper) => {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
            }}
            breakpoints={{
              640: { slidesPerView: 1 },
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="testimonial-swiper pb-14!"
          >
            <style jsx global>{`
              .testimonial-swiper {
                overflow-x: clip !important;
                overflow-y: visible !important;
                padding-top: 4px !important;
              }
              .testimonial-swiper .swiper-wrapper {
                align-items: stretch;
              }
              .testimonial-swiper .swiper-slide {
                overflow: visible;
              }
              .testimonial-swiper .swiper-pagination {
                bottom: 0 !important;
              }
              .testimonial-swiper .swiper-pagination-bullet-active {
                background: oklch(0.55 0.22 280) !important;
                width: 16px !important;
                border-radius: 4px !important;
              }
              .testimonial-swiper .swiper-pagination-bullet {
                background: oklch(0.90 0.005 270);
                opacity: 1;
              }
            `}</style>

            {testimonials.map((testimonial, index) => {
              const name = testimonial.user?.full_name || testimonial.author || testimonial.name || "Anonymous";
              const designation = testimonial.user?.headline || testimonial.designation || testimonial.role || "Creator";
              const content = testimonial.content || testimonial.text || "";
              const image = testimonial.user?.profile_image || testimonial.image || testimonial.profile_image;

              return (
                <SwiperSlide key={index} className="h-auto">
                  <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-full hover:border-primary/30 transition-all">
                    <Quote className="size-8 text-primary/15 fill-current mb-4" />

                    <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-6">
                      "{content}"
                    </p>

                    <div className="flex items-center gap-3 border-t border-border pt-4">
                      <div className="relative size-12 rounded-full overflow-hidden ring-2 ring-border shrink-0">
                        <Image
                          fill
                          sizes="48px"
                          className="object-cover"
                          src={image ? getImageUrl(image?.file_path || image) : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&rounded=true&bold=true`}
                          alt={name}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-foreground font-semibold text-sm truncate">
                          {name}
                        </h4>
                        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                          {designation}
                        </span>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
