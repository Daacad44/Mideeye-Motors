import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const up: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.19, 1, 0.22, 1], delay: i * 0.08 },
  }),
};

/** Scroll-triggered fade-up. `index` staggers grouped children. */
export function Reveal({
  children,
  index = 0,
  className,
  as = 'div',
}: {
  children: ReactNode;
  index?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'span';
}) {
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      variants={up}
      custom={index}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </MotionTag>
  );
}
