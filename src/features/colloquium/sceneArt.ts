// The pictures on Sermo's scene cards: each scene names a lucide icon (scenes/*.ts), drawn on its group's colour.
import {
  BadgeCheck, BookOpen, Briefcase, Building2, Cake, CalendarDays, Car, CarTaxiFront, Castle, ChartNoAxesColumn, ChefHat, CircleHelp, Clapperboard, Clock, Coffee, Croissant, Crown,
  Feather, Fingerprint, Frame, Frown, Globe, GraduationCap, HandHeart, HandHelping, Handshake, Heart, HeartHandshake, History, Hotel, House, Image as ImageIcon, Info, KeyRound,
  Landmark, Laptop, ListOrdered, Lock, Luggage, Mail, MapPin, MessageCircleQuestion, MessageSquareOff, Music, Newspaper, Palette, PartyPopper, PawPrint, Phone, Pill, Plane,
  Presentation, Quote, Rocket, Scale, School, Scissors, Search, Shirt, ShoppingBasket, ShoppingCart, Siren, Soup, Sparkles, Split, Stethoscope, Sun, Telescope, Tent, Ticket,
  TrainFront, TreePalm, TrendingUp, UserRound, Users, UtensilsCrossed, Wand, Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SceneGroup } from '@/core/colloquium/scenes';

export const SCENE_ICONS: Record<string, LucideIcon> = {
  BadgeCheck, BookOpen, Briefcase, Building2, Cake, CalendarDays, Car, CarTaxiFront, Castle, ChartNoAxesColumn, ChefHat, CircleHelp, Clapperboard, Clock, Coffee, Croissant, Crown,
  Feather, Fingerprint, Frame, Frown, Globe, GraduationCap, HandHeart, HandHelping, Handshake, Heart, HeartHandshake, History, Hotel, House, Image: ImageIcon, Info, KeyRound,
  Landmark, Laptop, ListOrdered, Lock, Luggage, Mail, MapPin, MessageCircleQuestion, MessageSquareOff, Music, Newspaper, Palette, PartyPopper, PawPrint, Phone, Pill, Plane,
  Presentation, Quote, Rocket, Scale, School, Scissors, Search, Shirt, ShoppingBasket, ShoppingCart, Siren, Soup, Sparkles, Split, Stethoscope, Sun, Telescope, Tent, Ticket,
  TrainFront, Palmtree: TreePalm, TrendingUp, UserRound, Users, UtensilsCrossed, Wand, Wrench,
};

/** Each group's colour on the card's picture. */
export const GROUP_TONE: Record<SceneGroup, string> = {
  everyday: 'bg-accent-soft text-accent-text',
  travel: 'bg-sage-soft text-sage-text',
  work: 'bg-sunken text-ink',
  social: 'bg-accent-soft text-accent-text',
  culture: 'bg-sage-soft text-sage-text',
  games: 'bg-sunken text-ink',
  practice: 'bg-accent-soft text-accent-text',
  week: 'bg-sage-soft text-sage-text',
};
