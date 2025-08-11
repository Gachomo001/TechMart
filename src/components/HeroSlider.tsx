import { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

export const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  
  const slides = [
    {
      id: 1,
      title: 'PlayStation 5',
      subtitle: 'Next-gen gaming console',
      price: '$499.99',
      image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1800&q=80',
      buttonText: 'Shop PS5',
    },
    {
      id: 2,
      title: 'MacBook Pro 16"',
      subtitle: 'Supercharged for pros',
      price: '$2499.99',
      image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e5c09?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1800&q=80',
      buttonText: 'Shop MacBook',
    },
    {
      id: 3,
      title: 'Samsung QLED 4K TV',
      subtitle: 'Experience true-to-life picture quality',
      price: '$1299.99',
      image: 'https://images.unsplash.com/photo-1603366615916-9fa7e51710aa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1800&q=80',
      buttonText: 'Shop TVs',
    },
    {
      id: 4,
      title: 'Sony WH-1000XM5',
      subtitle: 'Industry-leading noise cancellation',
      price: '$399.99',
      image: 'https://images.unsplash.com/photo-1655721530998-9a0ecb14f8e3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1800&q=80',
      buttonText: 'Shop Headphones',
    },
    {
      id: 5,
      title: 'DJI Mavic 3',
      subtitle: 'Professional aerial photography redefined',
      price: '$2199.00',
      image: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1800&q=80',
      buttonText: 'Shop Drones',
    },
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
  }

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide()
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-[600px] overflow-hidden">
      <div
        className="flex transition-transform duration-1000 ease-out h-full"
        style={{
          transform: `translateX(-${currentSlide * 100}%)`,
        }}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="min-w-full h-full relative flex items-center justify-center"
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-10 text-white text-center px-4 max-w-4xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
                {slide.title}
              </h2>
              <p className="text-xl md:text-2xl mb-6 drop-shadow-md">
                {slide.subtitle}
              </p>
              <div className="text-3xl font-bold mb-8 drop-shadow-md">
                {slide.price}
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-md transition-all transform hover:scale-105">
                {slide.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/50 backdrop-blur-sm p-3 rounded-full hover:bg-black/70 transition-colors z-20"
        aria-label="Previous slide"
      >
        <ChevronLeftIcon size={28} className="text-white" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/50 backdrop-blur-sm p-3 rounded-full hover:bg-black/70 transition-colors z-20"
        aria-label="Next slide"
      >
        <ChevronRightIcon size={28} className="text-white" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide ? 'bg-white w-8' : 'bg-white/50 w-3'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default HeroSlider
