import { RouterProvider } from 'react-router'
import { MotionConfig } from 'motion/react'
import { router } from '@/app/routes'

export default function App() {
  // reducedMotion="user": as animações do Motion respeitam prefers-reduced-motion.
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  )
}
