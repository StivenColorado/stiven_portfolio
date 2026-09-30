import React, { useCallback, useEffect, useState, useRef } from 'react'
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { PROJECTS } from '../data/projects'
import type { ProjectType } from '../types/types'
import ProjectCard from './ProjectCard'
import ProjectDetailModal from './ProjectDetailModal'

const FEATURED = PROJECTS.filter(p => p.featured)

const useIntersectionObserver = (callback: () => void) => {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            callback()
          }
        })
      },
      { threshold: 0.1 }
    )

    const currentElement = elementRef.current
    if (currentElement) {
      observerRef.current.observe(currentElement)
    }

    return () => {
      if (observerRef.current && currentElement) {
        observerRef.current.unobserve(currentElement)
      }
    }
  }, [callback])

  return elementRef
}

const TypewriterText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const handleIntersection = useCallback(() => {
    if (!hasAnimated) {
      setIsVisible(true)
      setHasAnimated(true)
    }
  }, [hasAnimated])

  const elementRef = useIntersectionObserver(handleIntersection)

  useEffect(() => {
    if (isVisible && currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, 100)
      
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, text, isVisible])

  return (
    <div ref={elementRef} className="inline-block">
      <span className={className}>{displayText}</span>
    </div>
  )
}

const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const EmblaCarousel: React.FC = () => {
  const [detailProject, setDetailProject] = useState<ProjectType | null>(null)
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'start',
      skipSnaps: false,
      dragFree: true
    },
    prefersReducedMotion ? [] : [Autoplay({ delay: 4000, stopOnInteraction: false })]
  )

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index)
  }, [emblaApi])

  const onInit = useCallback((emblaApi: NonNullable<UseEmblaCarouselType[1]>) => {
    setScrollSnaps(emblaApi.scrollSnapList())
  }, [])

  const onSelect = useCallback((emblaApi: NonNullable<UseEmblaCarouselType[1]>) => {
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [])

  useEffect(() => {
    if (!emblaApi) return

    onInit(emblaApi)
    onSelect(emblaApi)
    emblaApi.on('reInit', onInit)
    emblaApi.on('select', onSelect)
  }, [emblaApi, onInit, onSelect])

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="min-h-6 pb-2">
        <TypewriterText
          text="// desliza para ver los proyectos"
          className="font-mono text-sm text-muted"
        />
      </div>
      <div className="embla relative">
        <div className="embla__viewport overflow-hidden pb-4 pt-1" ref={emblaRef}>
          <div className="embla__container flex">
            {FEATURED.map((project) => (
              <div key={project.slug} className="embla__slide flex-none w-[88%] sm:w-[60%] md:w-1/2 lg:w-1/3 pr-6 pb-3">
                <ProjectCard project={project} onOpen={setDetailProject} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button aria-label="Anterior" className="btn !min-h-9 !px-3 font-mono text-lg" onClick={scrollPrev}>
            ‹
          </button>
          <div className="flex gap-1">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                aria-label={`Ir al proyecto ${index + 1}`}
                aria-current={index === selectedIndex}
                className="flex h-6 w-4 items-center justify-center"
                onClick={() => scrollTo(index)}
              >
                <span className={`block h-2.5 w-2.5 border-2 border-ink ${index === selectedIndex ? 'bg-ink' : 'bg-paper'}`} />
              </button>
            ))}
          </div>
          <button aria-label="Siguiente" className="btn !min-h-9 !px-3 font-mono text-lg" onClick={scrollNext}>
            ›
          </button>
        </div>
      </div>

      {detailProject && (
        <ProjectDetailModal project={detailProject} onClose={() => setDetailProject(null)} />
      )}
    </div>
  )
}

export default EmblaCarousel

// Instalación: