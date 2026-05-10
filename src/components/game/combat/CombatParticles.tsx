'use client';

interface CombatParticlesProps {
  /** Trigger a particle burst. Change this key to fire particles. */
  triggerKey: number;
  /** Type of particle effect */
  particleType: 'crit-star' | 'fire-spark' | 'bone-fragment' | 'neon-cyan' | 'neon-purple' | 'impact';
  /** How many particles to spawn */
  count?: number;
}

let nextId = 0;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

type ParticleType = CombatParticlesProps['particleType'];

function ParticleInner({ particleType, count }: { particleType: ParticleType; count: number }) {
  const particles: { id: number; type: string; style: React.CSSProperties; symbol?: string }[] = [];
  const starSymbols = ['✦', '✧', '⭐', '💫', '✶'];

  for (let i = 0; i < count; i++) {
    const id = nextId++;

    switch (particleType) {
      case 'crit-star': {
        const angle = (i / count) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = randomBetween(20, 45);
        particles.push({
          id,
          type: 'crit-star',
          symbol: starSymbols[id % starSymbols.length],
          style: {
            left: '50%',
            top: '50%',
            '--star-tx': `${Math.cos(rad) * dist}px`,
            '--star-ty': `${Math.sin(rad) * dist}px`,
            '--star-size': `${randomBetween(10, 18)}px`,
            animationDelay: `${i * 0.05}s`,
          } as React.CSSProperties,
        });
        break;
      }
      case 'fire-spark': {
        particles.push({
          id,
          type: 'fire-spark',
          style: {
            left: `${randomBetween(20, 80)}%`,
            top: `${randomBetween(30, 70)}%`,
            '--spark-tx': `${randomBetween(-15, 15)}px`,
            '--spark-ty': `${randomBetween(-25, -10)}px`,
            '--spark-w': `${randomBetween(2, 4)}px`,
            '--spark-h': `${randomBetween(6, 12)}px`,
            animationDelay: `${i * 0.08}s`,
          } as React.CSSProperties,
        });
        break;
      }
      case 'bone-fragment': {
        particles.push({
          id,
          type: 'bone-fragment',
          style: {
            left: `${randomBetween(25, 75)}%`,
            top: `${randomBetween(30, 60)}%`,
            '--bone-tx': `${randomBetween(-20, 20)}px`,
            '--bone-ty': `${randomBetween(-30, -15)}px`,
            '--bone-w': `${randomBetween(3, 6)}px`,
            '--bone-h': `${randomBetween(6, 12)}px`,
            animationDelay: `${i * 0.1}s`,
          } as React.CSSProperties,
        });
        break;
      }
      case 'neon-cyan': {
        particles.push({
          id,
          type: 'neon-trail-cyan',
          style: {
            left: `${randomBetween(20, 60)}%`,
            top: `${randomBetween(20, 60)}%`,
            '--trail-offset': `${randomBetween(-40, -20)}px`,
            '--trail-w': `${randomBetween(1, 3)}px`,
            '--trail-h': `${randomBetween(15, 30)}px`,
            animationDelay: `${i * 0.07}s`,
          } as React.CSSProperties,
        });
        break;
      }
      case 'neon-purple': {
        particles.push({
          id,
          type: 'neon-trail-purple',
          style: {
            left: `${randomBetween(30, 70)}%`,
            top: `${randomBetween(20, 60)}%`,
            '--trail-offset': `${randomBetween(-40, -20)}px`,
            '--trail-w': `${randomBetween(1, 3)}px`,
            '--trail-h': `${randomBetween(15, 30)}px`,
            animationDelay: `${i * 0.07}s`,
          } as React.CSSProperties,
        });
        break;
      }
      case 'impact': {
        if (i === 0) {
          particles.push({
            id,
            type: 'impact-ring',
            style: {
              '--ring-color': 'rgba(239, 68, 68, 0.6)',
            } as React.CSSProperties,
          });
        }
        break;
      }
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-40">
      {particles.map(p => {
        if (p.type === 'crit-star') {
          return (
            <span key={p.id} className="crit-star-particle" style={p.style}>
              {p.symbol}
            </span>
          );
        }
        if (p.type === 'fire-spark') {
          return <div key={p.id} className="fire-spark" style={p.style} />;
        }
        if (p.type === 'bone-fragment') {
          return <div key={p.id} className="bone-fragment" style={p.style} />;
        }
        if (p.type.startsWith('neon-trail-')) {
          const colorClass = p.type === 'neon-trail-cyan' ? 'neon-trail-cyan'
            : p.type === 'neon-trail-purple' ? 'neon-trail-purple'
            : 'neon-trail-orange';
          return <div key={p.id} className={`neon-trail ${colorClass}`} style={p.style} />;
        }
        if (p.type === 'impact-ring') {
          return <div key={p.id} className="impact-ring" style={p.style} />;
        }
        return null;
      })}
    </div>
  );
}

export default function CombatParticles({ triggerKey, particleType, count = 6 }: CombatParticlesProps) {
  if (triggerKey <= 0) return null;

  // Use `key={triggerKey}` on ParticleInner to force remount on each trigger,
  // which automatically starts CSS animations fresh and self-cleans when done.
  return <ParticleInner key={triggerKey} particleType={particleType} count={count} />;
}
