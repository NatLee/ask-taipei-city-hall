import { createElement } from 'react';
import {
  Briefcase,
  Building2,
  Bus,
  CircleHelp,
  Droplets,
  GraduationCap,
  HeartHandshake,
  IdCard,
  Landmark,
  Leaf,
  type LucideIcon,
  Palette,
  PawPrint,
  Receipt,
  Shield,
  Stethoscope,
  Store,
} from 'lucide-react';

/** Icon names used in data/categories.json. Unknown names fall back to a question mark. */
const ICONS: Record<string, LucideIcon> = {
  'heart-handshake': HeartHandshake,
  briefcase: Briefcase,
  receipt: Receipt,
  bus: Bus,
  leaf: Leaf,
  'paw-print': PawPrint,
  stethoscope: Stethoscope,
  store: Store,
  'building-2': Building2,
  droplets: Droplets,
  'graduation-cap': GraduationCap,
  palette: Palette,
  shield: Shield,
  'id-card': IdCard,
  landmark: Landmark,
  'circle-help': CircleHelp,
};

/** The icon for a category's icon name; unknown names get a question mark. */
export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  return createElement(ICONS[name] ?? CircleHelp, { className, 'aria-hidden': true });
}
