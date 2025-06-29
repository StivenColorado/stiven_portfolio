import React from "react"
import { motion } from "framer-motion"
import Layout from "../components/Layout"
import EmblaCarousel from "../components/EmblaCarousel"
import ExperienceTimeline from "../components/ExperienceItemTimeline"

const Home: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen  py-16 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center mb-20"
        >
          <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-6">
            Hola, soy Stiven 👋
          </h1>
          <p className="text-2xl text-gray-300 mb-8">
            Desarrollador Full Stack apasionado por crear experiencias digitales excepcionales
          </p>
          <div className="h-1 w-32 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded-full" />
        </motion.div>
        
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mb-24"
        >
          <ExperienceTimeline />
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-7xl mx-auto mb-20"
        >
          <h2 className="text-4xl font-bold text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Proyectos Destacados
          </h2>
          <EmblaCarousel />
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-center mt-8"
        >
          <a 
            href="/projects" 
            className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/20"
          >
            Ver Todos los Proyectos
          </a>
        </motion.div>
      </div>
    </Layout>
  )
}

export default Home
