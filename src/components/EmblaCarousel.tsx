import React, { useCallback, useEffect, useState, useRef } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { PROJECTS } from '../data/projects'
import { FaArrowDown, FaCode, FaExternalLinkAlt, FaGithub } from 'react-icons/fa'
import GistModal from './GistModal'

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

const EmblaCarousel: React.FC = () => {
  const [selectedGist, setSelectedGist] = useState<string | null>(null)
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'start',
      skipSnaps: false,
      dragFree: true
    },
    [Autoplay({ delay: 4000, stopOnInteraction: false })]
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

  const onInit = useCallback((emblaApi: any) => {
    setScrollSnaps(emblaApi.scrollSnapList())
  }, [])

  const onSelect = useCallback((emblaApi: any) => {
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
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center pb-2 min-h-[60px]">
        <TypewriterText
          text="// desliza para ver los proyectos"
          className="font-mono text-base text-zinc-500 dark:text-zinc-300 text-center"
        />
        <FaArrowDown className="text-zinc-500 dark:text-zinc-300 text-2xl mt-2 animate-bounce" />
      </div>
      <div className="embla relative">
        <div
          className="embla__viewport overflow-hidden py-4"
          ref={emblaRef}
          style={{
            // Degradado en los bordes: los proyectos se desvanecen al salir de vista
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%)',
          }}
        >
          <div className="embla__container flex">
            {PROJECTS.map((project, index) => (
              <div key={index} className="embla__slide flex-none w-full md:w-1/2 lg:w-1/3 pl-4 select-none">
                <div className="bg-white dark:bg-zinc-900 rounded-lg overflow-hidden border-2 border-zinc-900 dark:border-zinc-100 shadow-[5px_5px_0_0_#18181b] dark:shadow-[5px_5px_0_0_#fafafa] h-full flex flex-col transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#18181b] dark:hover:shadow-[7px_7px_0_0_#fafafa] select-none">
                  {/* Barra superior estilo "ventana" retro */}
                  <div className="flex items-center justify-between px-3 py-2 border-b-2 border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-zinc-900 dark:border-zinc-100" />
                      <span className="w-2.5 h-2.5 rounded-full border border-zinc-900 dark:border-zinc-100" />
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {project.tags[0]?.name ?? "project"}
                    </span>
                  </div>
                  <div className="relative h-48 w-full overflow-hidden border-b-2 border-zinc-900 dark:border-zinc-100">
                    <img
                      src={project.images[0]}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{project.title}</h3>
                    <p className="text-zinc-600 dark:text-gray-300 text-sm mb-4 flex-1">{project.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.tags.map((tag, tagIndex) => {
                        const TagIcon = tag.icon;
                        return (
                          <div
                            key={tagIndex}
                            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            title={tag.name}
                          >
                            {TagIcon && <TagIcon className="w-3.5 h-3.5 grayscale opacity-80" />}
                            <span>{tag.name}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-2 rounded-md font-semibold transition-colors hover:bg-transparent hover:text-zinc-900 dark:hover:bg-transparent dark:hover:text-zinc-100"
                        >
                          <FaExternalLinkAlt className="text-xs" />
                          <span>Ver Proyecto</span>
                        </a>
                      )}
                      {project.github && (
                        <a
                          href={project.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 px-3 py-2 rounded-md font-semibold transition-colors hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
                        >
                          <FaGithub className="text-sm" />
                          <span>Repositorio</span>
                        </a>
                      )}
                      {project.gist && (
                        <button
                          onClick={() => setSelectedGist(project.gist || null)}
                          className="flex items-center gap-1.5 text-sm border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 px-3 py-2 rounded-md font-semibold transition-colors hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
                        >
                          <FaCode className="text-sm" />
                          <span>Código</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <button
          aria-label="Anterior"
          className="embla__prev absolute left-1 sm:left-2 top-1/2 transform -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 rounded-full transition-colors z-20 font-mono"
          onClick={scrollPrev}
        >
          ←
        </button>
        <button
          aria-label="Siguiente"
          className="embla__next absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 rounded-full transition-colors z-20 font-mono"
          onClick={scrollNext}
        >
          →
        </button>

        {/* Dots */}
        <div className="flex justify-center mt-6 gap-2">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${index === selectedIndex ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              onClick={() => scrollTo(index)}
            />
          ))}
        </div>
      </div>
      
      {/* Modal para mostrar el gist */}
      {selectedGist && (
        <GistModal
          gistUrl={selectedGist}
          project={PROJECTS.find(project => project.gist === selectedGist)}
          onClose={() => setSelectedGist(null)}
        />
      )}
    </div>
  )
}

export default EmblaCarousel

// Instalación: