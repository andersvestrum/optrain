import {
  Footprints,
  Bike,
  Waves,
  Mountain,
  Dumbbell,
  PersonStanding,
  Activity,
  Rows3,
  Snowflake,
  type LucideProps,
} from 'lucide-react'

const TYPE_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Run: Footprints,
  TrailRun: Mountain,
  VirtualRun: Footprints,
  Walk: Footprints,
  Hike: Mountain,
  Ride: Bike,
  VirtualRide: Bike,
  MountainBikeRide: Bike,
  Swim: Waves,
  WeightTraining: Dumbbell,
  Crossfit: Dumbbell,
  Yoga: PersonStanding,
  Workout: Activity,
  Rowing: Rows3,
  Kayaking: Waves,
  AlpineSki: Snowflake,
  NordicSki: Snowflake,
  Snowboard: Snowflake,
}

interface ActivityIconProps extends LucideProps {
  type: string
}

export default function ActivityIcon({ type, ...props }: ActivityIconProps) {
  const Icon = TYPE_MAP[type] ?? Activity
  return <Icon {...props} />
}
