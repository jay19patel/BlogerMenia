"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { api } from "@/lib/api";
import LoaderCard from "@/components/ui/loader";
import { getImageUrl } from "@/lib/utils";
import Image from "next/image";

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
      <section className="py-24 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoaderCard message="Fetching feedback data…" />
          </div>
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) return null;

  return (
    <section className="py-24 border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-14 border-b-2 border-foreground pb-8">
          <div>
            <div className="inline-flex items-center text-sm font-mono text-gray-500 mb-6">
              <span className="bg-foreground text-background py-1 px-3 text-xs font-semibold uppercase tracking-widest border border-foreground mr-4">
                SYS-FBK
              </span>
              User Analytics
            </div>
            <h2 className="text-4xl font-extrabold text-foreground uppercase tracking-tight">
              Deployment Feedback
            </h2>
            <p className="text-gray-500 font-mono text-sm mt-4 max-w-2xl">
              Telemetry and reviews from verified architects and system engineers using BlogerMenia.
            </p>
          </div>

          {/* Slider Controls */}
          <div className="flex items-center gap-4 mt-6 md:mt-0">
            <button
              ref={prevRef}
              className="flex justify-center items-center border-2 border-foreground bg-background w-12 h-12 transition-all duration-300 hover:bg-foreground hover:text-background shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-6 w-6 stroke-[3]" />
            </button>
            <button
              ref={nextRef}
              className="flex justify-center items-center border-2 border-foreground bg-background w-12 h-12 transition-all duration-300 hover:bg-foreground hover:text-background shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-6 w-6 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Swiper Area */}
        <div className="w-full">
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
              bulletActiveClass: 'swiper-pagination-bullet-active-brutalist',
            }}
            onBeforeInit={(swiper) => {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
            }}
            breakpoints={{
              640: { slidesPerView: 1 },
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="testimonial-swiper !pb-16"
          >
            <style jsx global>{`
              /* Allow vertical overflow so cards can translate up on hover
                 without being clipped, while still hiding horizontal overflow
                 so the slide animation looks correct. Extra top padding keeps
                 the shadow visible too. */
              .testimonial-swiper {
                overflow-x: clip !important;
                overflow-y: visible !important;
                padding-top: 16px !important;
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
              .testimonial-swiper .swiper-pagination-bullet-active-brutalist {
                background: #000 !important;
                border: 2px solid #000 !important;
                width: 20px !important;
                height: 8px !important;
                border-radius: 0 !important;
                transition: all 0.2s ease;
              }
              .testimonial-swiper .swiper-pagination-bullet {
                background: transparent;
                border: 2px solid #ccc;
                width: 12px;
                height: 12px;
                border-radius: 0;
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
                  <div className="bg-background border-2 border-foreground p-8 flex flex-col relative group transition-all duration-300 hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(88,28,135,1)] h-full">
                    
                    <div className="absolute top-6 right-6 text-gray-200 group-hover:text-indigo-100 transition-colors">
                      <Quote className="w-12 h-12 fill-current" />
                    </div>

                    <div className="flex items-center gap-5 mb-8 border-b-2 border-gray-100 pb-6 relative z-10">
                      <div className="relative w-16 h-16 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] bg-white overflow-hidden shrink-0">
                        <Image
                          fill
                          sizes="64px"
                          className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          src={image ? getImageUrl(image?.file_path || image) : `https://ui-avatars.com/api/?name=${name}&background=0D1117&color=fff&rounded=false&bold=true`}
                          alt={name}
                        />
                      </div>
                      <div className="min-w-0 pr-8">
                        <h4 className="text-foreground font-black uppercase text-lg mb-1 truncate tracking-tight">
                          {name}
                        </h4>
                        <div className="inline-block px-2 py-1 bg-gray-100 border border-gray-300 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                          {designation}
                        </div>
                      </div>
                    </div>

                    <div className="flex-grow relative z-10">
                      <p className="text-gray-700 font-mono text-sm leading-relaxed">
                        "{content}"
                      </p>
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
