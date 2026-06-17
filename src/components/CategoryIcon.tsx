import React from 'react';
import * as Lucide from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CategoryIcon({ name, className = "w-4 h-4", style }: CategoryIconProps) {
  const map: Record<string, React.ComponentType<any>> = {
    food: Lucide.Utensils,
    shopping: Lucide.ShoppingBag,
    coffee: Lucide.Coffee,
    sports: Lucide.Dumbbell,
    health: Lucide.HeartPulse,
    social: Lucide.Users,
    income: Lucide.Coins,
    home: Lucide.Home,
    car: Lucide.Car,
    plane: Lucide.Plane,
    game: Lucide.Gamepad2,
    education: Lucide.GraduationCap,
    gift: Lucide.Gift,
    business: Lucide.Briefcase,
    book: Lucide.BookOpen,
    wrench: Lucide.Wrench,
    electricity: Lucide.Zap,
    wifi: Lucide.Wifi,
    tv: Lucide.Tv,
    film: Lucide.Film,
    clothing: Lucide.Shirt,
    beauty: Lucide.Sparkles,
    baby: Lucide.Baby,
    pet: Lucide.PawPrint,
    gadget: Lucide.Smartphone,
    piggy: Lucide.PiggyBank,
    ticket: Lucide.Ticket,
    bus: Lucide.Bus,
    receipt: Lucide.Receipt,
    charity: Lucide.Heart
  };

  const IconComponent = map[name] || Lucide.Receipt;
  return <IconComponent className={className} style={style} />;
}
