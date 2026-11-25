import { cn } from 'cn'

import { CharacterAvatar } from '@/app/components/ui/custom/character-avatar'
import { pathFrom, pathLength, pointsAlong } from '@/app/helpers/map-path'
import type { AvatarLook } from '@/models/avatar/layers'
import { AVATAR_MANIFEST } from '@/models/avatar/manifest'
import { MAP_MANIFEST } from '@/models/mission/map-manifest'
import type { MissionMapId } from '@/models/mission/maps'
import type { ObjectiveState } from '@/models/objective-submission/rules'

type MissionMapProps = {
  map: MissionMapId
  states: readonly ObjectiveState[]
  // -1 once the mission is done
  currentIndex: number
  look: AvatarLook | null
}

const MARKER_CLASS_NAMES: Record<ObjectiveState, string> = {
  locked: 'bg-neutral-600 text-neutral-200',
  available: 'bg-white text-black',
  pending: 'bg-amber-400 text-black',
  returned: 'bg-red-500 text-white',
  approved: 'bg-emerald-500 text-black'
}

// The fog starts a little past the current point, so its marker stays clear
const FOG_GAP = 24

// How far the avatar's feet sit from the top of its frame
const AVATAR_FEET = 56

const FOG_FILTER_ID = 'mission-map-fog'

// Hidden from assistive technology: the list of objectives below says the same (#97)
export const MissionMap = ({
  map,
  states,
  currentIndex,
  look
}: MissionMapProps) => {
  const { src, path } = MAP_MANIFEST.maps[map]
  const { width, height } = MAP_MANIFEST
  const points = pointsAlong(path, states.length)
  const avatarPoint = points[currentIndex] ?? points.at(-1)
  const step = states.length > 1 ? pathLength(path) / (states.length - 1) : 0
  const fog =
    currentIndex === -1 || currentIndex === states.length - 1
      ? []
      : pathFrom(path, step * currentIndex + FOG_GAP)

  return (
    <div
      aria-hidden
      className="pixel-border m-1.5 w-fit max-w-[calc(100%-(--spacing(3)))]"
    >
      <div className="overflow-x-auto">
        <div
          className="relative bg-cover pixelated 2xl:zoom-[2]"
          style={{ width, height, backgroundImage: `url(${src})` }}
        >
          {points.map(([x, y], index) => (
            <span
              key={index}
              className={cn(
                'absolute flex size-5 -translate-1/2 items-center justify-center border-2 border-black text-[8px]',
                MARKER_CLASS_NAMES[states[index]!]
              )}
              style={{ left: x, top: y }}
            >
              {index + 1}
            </span>
          ))}
          {fog.length > 0 && (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="absolute inset-0 size-full"
            >
              {/* The whole map, since the default region of a filter cuts the blur at the stroke's ends */}
              <filter
                id={FOG_FILTER_ID}
                filterUnits="userSpaceOnUse"
                x={0}
                y={0}
                width={width}
                height={height}
              >
                <feGaussianBlur stdDeviation={12} />
              </filter>
              <polyline
                points={fog.map((point) => point.join(',')).join(' ')}
                fill="none"
                stroke="white"
                strokeOpacity={0.8}
                strokeWidth={96}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#${FOG_FILTER_ID})`}
              />
            </svg>
          )}
          {look && avatarPoint && (
            <CharacterAvatar
              look={look}
              still
              scale={1}
              className="absolute"
              style={{
                left: avatarPoint[0] - AVATAR_MANIFEST.frameSize / 2,
                top: avatarPoint[1] - AVATAR_FEET
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
