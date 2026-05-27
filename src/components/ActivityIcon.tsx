/**
 * SportIcon — maps Strava activity types to the best available open-source icon.
 *
 * Primary library : react-icons/md  (Material Design — has dedicated sport icons for almost every Strava type)
 * Supplement      : react-icons/fa6 (Font Awesome 6 — fills the few gaps MD is missing)
 * Fallback        : inline SVG for truly unknown types
 *
 * Strava uses its own proprietary icon set; this is the closest freely-available equivalent.
 */
import type { IconType } from 'react-icons'
import {
  MdDirectionsRun,
  MdDirectionsWalk,
  MdDirectionsBike,
  MdElectricBike,
  MdRowing,
  MdSurfing,
  MdKitesurfing,
  MdKayaking,
  MdDownhillSkiing,
  MdSnowboarding,
  MdSnowshoeing,
  MdIceSkating,
  MdSkateboarding,
  MdSnowmobile,
  MdFitnessCenter,
  MdSportsGymnastics,
  MdSportsMartialArts,
  MdSportsSoccer,
  MdSportsFootball,
  MdSportsBasketball,
  MdSportsVolleyball,
  MdSportsTennis,
  MdSportsGolf,
  MdSportsCricket,
  MdSportsRugby,
  MdSportsHandball,
  MdSportsBaseball,
  MdSportsMotorsports,
  MdSelfImprovement,
} from 'react-icons/md'
import {
  FaPersonSwimming,
  FaPersonHiking,
  FaPersonSkiingNordic,
  FaMountain,
} from 'react-icons/fa6'
import { GiBowlingStrike } from 'react-icons/gi'

const TYPE_MAP: Record<string, IconType> = {
  // Running
  Run: MdDirectionsRun,
  TrailRun: FaPersonHiking,
  VirtualRun: MdDirectionsRun,

  // Walking & hiking
  Walk: MdDirectionsWalk,
  Hike: FaPersonHiking,

  // Cycling
  Ride: MdDirectionsBike,
  VirtualRide: MdDirectionsBike,
  MountainBikeRide: MdDirectionsBike,
  GravelRide: MdDirectionsBike,
  EBikeRide: MdElectricBike,
  Handcycle: MdDirectionsBike,
  Velomobile: MdDirectionsBike,

  // Swimming
  Swim: FaPersonSwimming,
  OpenWaterSwim: FaPersonSwimming,

  // Strength & gym
  WeightTraining: MdFitnessCenter,
  Crossfit: MdFitnessCenter,
  Workout: MdFitnessCenter,
  Elliptical: MdFitnessCenter,
  StairStepper: MdFitnessCenter,
  HighIntensityIntervalTraining: MdFitnessCenter,

  // Mind & body
  Yoga: MdSelfImprovement,
  Pilates: MdSelfImprovement,
  Gymnastics: MdSportsGymnastics,
  JumpRope: MdFitnessCenter,

  // Water sports
  Kayaking: MdKayaking,
  Canoeing: MdKayaking,
  Rowing: MdRowing,
  StandUpPaddling: MdKayaking,
  Surfing: MdSurfing,
  Windsurf: MdKitesurfing,
  Kitesurf: MdKitesurfing,
  Waterpolo: MdSportsHandball,

  // Winter sports
  AlpineSki: MdDownhillSkiing,
  BackcountrySki: FaPersonSkiingNordic,
  NordicSki: FaPersonSkiingNordic,
  Snowboard: MdSnowboarding,
  Snowshoe: MdSnowshoeing,
  IceSkate: MdIceSkating,
  WinterSports: MdDownhillSkiing,
  Snowmobile: MdSnowmobile,

  // Climbing & mountains
  RockClimbing: FaMountain,
  Mountaineering: FaMountain,

  // Ball sports
  Soccer: MdSportsSoccer,
  Football: MdSportsFootball,
  Basketball: MdSportsBasketball,
  Volleyball: MdSportsVolleyball,
  Tennis: MdSportsTennis,
  TableTennis: MdSportsTennis,
  Squash: MdSportsTennis,
  Badminton: MdSportsTennis,
  Pickleball: MdSportsTennis,
  Golf: MdSportsGolf,
  DiscGolf: MdSportsGolf,
  Cricket: MdSportsCricket,
  Rugby: MdSportsRugby,
  Bowling: GiBowlingStrike,
  Baseball: MdSportsBaseball,
  Softball: MdSportsBaseball,
  Handball: MdSportsHandball,

  // Combat & martial arts
  Boxing: MdSportsMartialArts,
  MartialArts: MdSportsMartialArts,
  Wrestling: MdSportsMartialArts,

  // Other
  Motorbike: MdSportsMotorsports,
  Skateboarding: MdSkateboarding,
  Jetski: MdSurfing,
}

interface SportIconProps {
  type: string
  size?: number | string
  color?: string
  className?: string
  style?: React.CSSProperties
}

// Generic person-in-motion fallback for unknown types
function ActivityFallback({ size = 24, color = 'currentColor', className, style }: Omit<SportIconProps, 'type'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <circle cx="12" cy="5" r="1.5" />
      <path d="M7 14l3-4 2 3 2-3 3 4" />
      <path d="M9 20l1-4M14 16l1 4" />
    </svg>
  )
}

export default function SportIcon({ type, size = 24, color = 'currentColor', className, style }: SportIconProps) {
  const Icon = TYPE_MAP[type]
  if (!Icon) return <ActivityFallback size={size} color={color} className={className} style={style} />
  return <Icon size={size} color={color} className={className} style={style} />
}
