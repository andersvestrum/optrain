/**
 * SportIcon — maps Strava sport_type to the most accurate available icon.
 *
 * sport_type (not the legacy type field) is used so indoor/virtual variants
 * get distinct icons from their outdoor counterparts:
 *   Run vs VirtualRun (treadmill)
 *   Ride vs VirtualRide (indoor trainer)
 *   Rowing vs VirtualRow (erg)
 *
 * Primary  : react-icons/md  (Material Design — best sports coverage)
 * Supplement: react-icons/fa6 (fills MD gaps)
 * Custom SVG: ErgIcon (rowing machine), TreadmillIcon (treadmill)
 */
import type { FC } from 'react'
import type { IconType } from 'react-icons'
import {
  MdDirectionsRun,
  MdDirectionsWalk,
  MdDirectionsBike,
  MdPedalBike,
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

interface IconBaseProps {
  size?: number | string
  color?: string
  className?: string
  style?: React.CSSProperties
}

// ─── Custom SVGs for indoor-specific equipment ───────────────────────────────

/**
 * Rowing ergometer (Concept2 style):
 * circular flywheel on left → monorail → seat → vertical handle/footrest
 */
function ErgIcon({ size = 24, color = 'currentColor', className, style }: IconBaseProps) {
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
      {/* Flywheel housing */}
      <circle cx="6" cy="12" r="4.5" />
      {/* Flywheel centre */}
      <circle cx="6" cy="12" r="1" fill={color} stroke="none" />
      {/* Monorail */}
      <line x1="10.5" y1="12" x2="22" y2="12" />
      {/* Sliding seat */}
      <rect x="14" y="10" width="4" height="2" rx="0.5" />
      {/* Handle / footrest at far end */}
      <line x1="22" y1="9" x2="22" y2="15" />
    </svg>
  )
}

/**
 * Treadmill:
 * running belt platform with uprights and handrail, stick figure on top
 */
function TreadmillIcon({ size = 24, color = 'currentColor', className, style }: IconBaseProps) {
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
      {/* Belt platform */}
      <rect x="2" y="17" width="20" height="3" rx="1.5" />
      {/* Left upright */}
      <line x1="5" y1="17" x2="7" y2="10" />
      {/* Right upright */}
      <line x1="19" y1="17" x2="17" y2="10" />
      {/* Handrail */}
      <line x1="7" y1="10" x2="17" y2="10" />
      {/* Stick figure in running pose */}
      <circle cx="13" cy="5" r="1.5" />
      {/* torso */}
      <line x1="13" y1="6.5" x2="12.5" y2="9.5" />
      {/* left leg forward */}
      <line x1="12.5" y1="9.5" x2="10.5" y2="12.5" />
      {/* right leg back */}
      <line x1="12.5" y1="9.5" x2="14.5" y2="12.5" />
      {/* left arm back */}
      <line x1="13" y1="7.5" x2="10.5" y2="9" />
      {/* right arm forward */}
      <line x1="13" y1="7.5" x2="15.5" y2="8.5" />
    </svg>
  )
}

// ─── Generic fallback ─────────────────────────────────────────────────────────

function ActivityFallback({ size = 24, color = 'currentColor', className, style }: IconBaseProps) {
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

// ─── Type map (keyed on sport_type, not the legacy type field) ────────────────

type AnyIcon = IconType | FC<IconBaseProps>

const TYPE_MAP: Record<string, AnyIcon> = {
  // Running — outdoor vs treadmill
  Run: MdDirectionsRun,
  TrailRun: FaPersonHiking,
  VirtualRun: TreadmillIcon,       // treadmill

  // Walking & hiking
  Walk: MdDirectionsWalk,
  Hike: FaPersonHiking,

  // Cycling — outdoor vs indoor trainer
  Ride: MdDirectionsBike,          // person on bike with direction arrow
  VirtualRide: MdPedalBike,        // static bike frame — clearly different from Ride
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

  // Water sports — outdoor vs erg
  Rowing: MdRowing,                // outdoor (person in boat)
  VirtualRow: ErgIcon,             // indoor erg (Concept2 machine silhouette)
  Kayaking: MdKayaking,
  Canoeing: MdKayaking,
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

interface SportIconProps extends IconBaseProps {
  type: string
}

export default function SportIcon({ type, size = 24, color = 'currentColor', className, style }: SportIconProps) {
  const Icon = TYPE_MAP[type]
  if (!Icon) return <ActivityFallback size={size} color={color} className={className} style={style} />
  return <Icon size={size} color={color} className={className} style={style} />
}
