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
      <h2 className="text-3xl font-bold text-center mb-3 text-white">Mis Proyectos</h2>
      <div className="flex flex-col items-center justify-center pb-2 min-h-[60px]">
        <TypewriterText 
          text="desliza para ver los proyectos" 
          className="text-xl text-gray-300 text-center"
        />
        <FaArrowDown className="text-gray-300 text-2xl mt-2 animate-bounce" />
      </div>
      <div className="embla relative">
        <div className="embla__viewport overflow-hidden" ref={emblaRef}>
          <div className="embla__container flex">
            {PROJECTS.map((project, index) => (
              <div key={index} className="embla__slide flex-none w-full md:w-1/2 lg:w-1/3 pl-4 select-none">
                <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg h-full flex flex-col transform transition-transform duration-300 hover:scale-105 select-none">
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={project.images[0]}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-xl font-semibold text-white mb-2">{project.title}</h3>
                    <p className="text-gray-300 text-sm mb-4 flex-1">{project.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.tags.map((tag, tagIndex) => {
                        const TagIcon = tag.icon;
                        return (
                          <div
                            key={tagIndex}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-gray-700/50 backdrop-blur-sm ${tag.class}`}
                            title={tag.name}
                          >
                            {TagIcon && <TagIcon className="w-3.5 h-3.5" />}
                            <span>{tag.name}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-auto">
                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors"
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
                          className="flex items-center gap-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-md transition-colors"
                        >
                          <FaGithub className="text-sm" />
                          <span>Repositorio</span>
                        </a>
                      )}
                      {project.gist && (
                        <button
                          onClick={() => setSelectedGist(project.gist || null)}
                          className="flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-md transition-colors border border-gray-700"
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
          className="embla__prev absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
          onClick={scrollPrev}
        >
          ←
        </button>
        <button
          className="embla__next absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
          onClick={scrollNext}
        >
          →
        </button>

        {/* Dots */}
        <div className="flex justify-center mt-6 gap-2">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${index === selectedIndex ? 'bg-blue-600' : 'bg-gray-400'
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