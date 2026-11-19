"use client"

import React, { useCallback, useMemo, type HTMLAttributes } from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

interface WarpBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  perspective?: number
  beamsPerSide?: number
  beamSize?: number
  beamDelayMax?: number
  beamDelayMin?: number
  beamDuration?: number
  gridColor?: string
  /** Saella: beam colour (a token); beams fade from it to transparent. */
  beamColor?: string
  /** Saella: false draws the grid only. */
  showBeams?: boolean
  /** Saella: drawn at the leading tip of every beam (the beam becomes its trail). */
  beamHead?: React.ReactNode
}

const pseudoRandom = (n: number) => {
  const x = Math.sin(n + 1) * 10000
  return x - Math.floor(x)
}

// Saella: beams in one token colour instead of random hues (one accent family); the aspect ratio is
// picked with the beam's position so render stays pure. Reduced motion hides the beams (CSS), the grid stays.
const Beam = ({
  width,
  x,
  delay,
  duration,
  ar,
  color,
  head,
  headTurn = 0,
}: {
  width: string | number
  x: string | number
  delay: number
  duration: number
  ar: number
  color: string
  head?: React.ReactNode
  headTurn?: number
}) => {
  return (
    <motion.div
      style={
        {
          "--x": `${x}`,
          "--width": `${width}`,
          "--aspect-ratio": `${ar}`,
          "--background": `linear-gradient(${color}, transparent)`,
        } as React.CSSProperties
      }
      className={`absolute top-0 left-(--x) motion-reduce:hidden aspect-[1/var(--aspect-ratio)] w-(--width) [background:var(--background)] transform-3d`}
      initial={{ y: "100cqmax", x: "-50%" }}
      animate={{ y: "-100%", x: "-50%" }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {/* Saella: optional element riding the beam's leading tip, stood up to face the viewer. It fades in over the
          first part of each run instead of popping in at the far end, and never shrinks below 12px. */}
      {head && (
        <motion.div
          className="absolute top-0 left-1/2 flex w-[130%] min-w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          // Stand up to face the viewer, then undo the side face's turn so the head stays upright on every side.
          style={{ transform: `rotateX(90deg) rotateZ(${headTurn}deg)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1] }}
          transition={{ duration, delay, repeat: Infinity, ease: "linear", times: [0, 0.2, 1] }}
        >
          {head}
        </motion.div>
      )}
    </motion.div>
  )
}

export const WarpBackground: React.FC<WarpBackgroundProps> = ({
  children,
  perspective = 100,
  className,
  beamsPerSide = 3,
  beamSize = 5,
  beamDelayMax = 3,
  beamDelayMin = 0,
  beamDuration = 3,
  gridColor = "var(--border)",
  beamColor = "var(--primary)",
  showBeams = true,
  beamHead,
  ...props
}) => {
  // Saella: deterministic "random" (server and client render the same beams, no hydration mismatch).
  const generateBeams = useCallback((side: number) => {
    const beams = []
    const cellsPerSide = Math.floor(100 / beamSize)
    const step = cellsPerSide / beamsPerSide

    for (let i = 0; i < beamsPerSide; i++) {
      const x = Math.floor(i * step)
      const delay = pseudoRandom(side * 31 + i) * (beamDelayMax - beamDelayMin) + beamDelayMin
      const ar = Math.floor(pseudoRandom(side * 47 + i + 7) * 10) + 1
      beams.push({ x, delay, ar })
    }
    return beams
  }, [beamsPerSide, beamSize, beamDelayMax, beamDelayMin])

  const topBeams = useMemo(() => generateBeams(0), [generateBeams])
  const rightBeams = useMemo(() => generateBeams(1), [generateBeams])
  const bottomBeams = useMemo(() => generateBeams(2), [generateBeams])
  const leftBeams = useMemo(() => generateBeams(3), [generateBeams])

  return (
    <div className={cn("relative rounded border p-20", className)} {...props}>
      <div
        style={
          {
            "--perspective": `${perspective}px`,
            "--grid-color": gridColor,
            "--beam-size": `${beamSize}%`,
          } as React.CSSProperties
        }
        className={
          "@container-[size] pointer-events-none absolute top-0 left-0 size-full overflow-hidden [clipPath:inset(0)] perspective-(--perspective) transform-3d"
        }
      >
        {/* top side */}
        <div className="@container absolute z-20 h-[100cqmax] w-[100cqi] origin-[50%_0%] transform-[rotateX(-90deg)] bg-size-[var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,var(--grid-color)_0_1px,transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] transform-3d">
          {showBeams && topBeams.map((beam, index) => (
            <Beam
              key={`top-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
              ar={beam.ar}
              color={beamColor}
              head={beamHead}
            />
          ))}
        </div>
        {/* bottom side */}
        <div className="@container absolute top-full h-[100cqmax] w-[100cqi] origin-[50%_0%] transform-[rotateX(-90deg)] bg-size-[var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,var(--grid-color)_0_1px,transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] transform-3d">
          {showBeams && bottomBeams.map((beam, index) => (
            <Beam
              key={`bottom-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
              ar={beam.ar}
              color={beamColor}
              head={beamHead}
            />
          ))}
        </div>
        {/* left side */}
        <div className="@container absolute top-0 left-0 h-[100cqmax] w-[100cqh] origin-[0%_0%] transform-[rotate(90deg)_rotateX(-90deg)] bg-size-[var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,var(--grid-color)_0_1px,transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] transform-3d">
          {showBeams && leftBeams.map((beam, index) => (
            <Beam
              key={`left-${index}`}
              headTurn={-90}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
              ar={beam.ar}
              color={beamColor}
              head={beamHead}
            />
          ))}
        </div>
        {/* right side */}
        <div className="@container absolute top-0 right-0 h-[100cqmax] w-[100cqh] origin-[100%_0%] transform-[rotate(-90deg)_rotateX(-90deg)] bg-size-[var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,var(--grid-color)_0_1px,transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] transform-3d">
          {showBeams && rightBeams.map((beam, index) => (
            <Beam
              key={`right-${index}`}
              headTurn={90}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
              ar={beam.ar}
              color={beamColor}
              head={beamHead}
            />
          ))}
        </div>
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
