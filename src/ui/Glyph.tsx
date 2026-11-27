// Icons instead of emojis. Lessons, paths and answer lines still carry an emoji as a short key
// (the scoring rules match on them, e.g. "📦" for an order line), but nothing on screen shows one:
// <Glyph e="📦" /> draws the matching line icon, and stripEmoji() takes emojis out of free text
// (Pipo's messages, chat bubbles). Unknown emojis fall back to a small sparkle.
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  AlarmClock, Apple, Archive, Armchair, ArrowRight, ArrowUp, Award, Baby, Backpack, BadgeCheck, Ban, Banana,
  Banknote, Bath, BatteryFull, Bed, Beef, Beer, Bell, Bike, Bird, Blocks, Bookmark, BookOpen, BookOpenText,
  Brain, BriefcaseBusiness, Brush, Bug, Building, Building2, Bus, Cake, CakeSlice, Calculator, Calendar,
  CalendarDays, CalendarRange, Camera, Candy, Car, Carrot, CarTaxiFront, Castle, Cat, ChartColumn,
  ChartLine, ChartPie, Check, ChefHat, Cherry, Church, CircleAlert, CircleCheck, CircleHelp, CircleParking,
  CircleX, Citrus, Clapperboard, ClipboardList, Clock, Cloud, CloudRain, CloudSun, Coffee, Coins, Compass,
  Construction, Cookie, CookingPot, CreditCard, Croissant, Crown, CupSoda, Dices, Dna, Dog, DollarSign,
  Donut, Download, DraftingCompass, Droplet, Droplets, Drum, Drumstick, Dumbbell, Earth, Egg, EggFried,
  Euro, Eye, EyeOff, Factory, FileText, Film, Fish, Flag, Flame, FlaskConical, Flower, Flower2, Folder,
  FolderOpen, Footprints, Frown, Fuel, Gamepad, Gamepad2, Gem, Gift, Glasses, Globe, Goal, GraduationCap,
  Grape, Guitar, Ham, Hamburger, Hammer, Hand, HandCoins, HandHeart, Handshake, Headphones, Heart,
  HeartHandshake, HeartPulse, Hospital, Hotel, Hourglass, House, IceCreamCone, IdCard, Image, Inbox, Info,
  JapaneseYen, Key, Keyboard, Landmark, Laptop, Laugh, Leaf, Lightbulb, Link, Lock, LockOpen, Mail, Mailbox,
  MailOpen, Map, MapPin, Medal, Megaphone, Meh, MessageCircle, Mic, Microscope, Milk, Minus, Monitor, Moon,
  Mountain, Mouse, Music, Music2, Newspaper, Notebook, NotebookPen, NotebookText, OctagonAlert, Package,
  Paintbrush, Palette, Paperclip, PartyPopper, PawPrint, Pencil, PenLine, PenTool, PersonStanding, Phone,
  Piano, PiggyBank, Pill, Pin, Pizza, Plane, PlaneTakeoff, Plug, Plus, Pointer, Popcorn, Presentation,
  Printer, Puzzle, Rabbit, Radio, ReceiptText, Recycle, RefreshCw, Rocket, Route, Ruler, Salad, Sandwich,
  Scale, School, Scissors, ScrollText, Search, Send, Settings, Share, Shield, Ship, Shirt, ShoppingBag,
  ShoppingBasket, ShoppingCart, ShowerHead, Signal, Siren, Smartphone, Smile, Snowflake, Sofa, Soup,
  Sparkles, Speech, Sprout, SquareCheck, Star, Stethoscope, StickyNote, Store, Sun, Sunrise, Sunset, Tag,
  Target, Tent, Thermometer, ThumbsUp, Ticket, Timer, TrainFront, Trash2, TreePine, Trees, TrendingUp,
  TriangleAlert, Trophy, Truck, Turtle, Tv, Umbrella, User, UserRound, Users, UsersRound, Utensils, Video,
  Volleyball, Volume2, VolumeX, Wallet, Watch, Waves, Wheat, Wifi, Wind, Wine, Wrench, X, Zap,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  // People and places
  "👥": Users, "👤": User, "👪": UsersRound, "👨‍👩‍👧‍👦": UsersRound, "🧒": Smile, "👧": UserRound,
  "👵": UserRound, "👩‍🏫": Presentation, "🧑‍🍳": ChefHat, "🙂": Smile, "🙋": Hand, "✋": Hand,
  "👆": Pointer, "🙅": CircleX, "🙈": EyeOff, "👀": Eye, "🗣": Speech, "🤝": Handshake, "🤒": Thermometer,
  "🏡": House, "🏠": House, "🏘": Building2, "🏫": School, "🏨": Hotel, "🏛": Landmark, "🎓": GraduationCap,
  "💼": BriefcaseBusiness, "🚀": Rocket, "🎒": Backpack,
  // Messages and paperwork
  "💬": MessageCircle, "📨": Send, "✉": Mail, "📧": Mail, "💌": MailOpen, "📤": Share, "📞": Phone,
  "📣": Megaphone, "🎤": Mic, "📋": ClipboardList, "📝": NotebookPen, "✏": Pencil, "✍": PenLine,
  "📄": FileText, "📜": ScrollText, "📎": Paperclip, "🧾": ReceiptText, "🔖": Bookmark, "🏷": Tag,
  "📖": BookOpenText, "📚": BookOpen,
  // Time
  "📅": Calendar, "🗓": CalendarDays, "📆": CalendarRange, "⏰": AlarmClock, "⏱": Timer, "⏳": Hourglass,
  "🕗": Clock, "🕙": Clock, "🕓": Clock, "🕕": Clock, "🌅": Sunrise, "☀": Sun, "🌙": Moon,
  // Money and shopping
  "💵": Banknote, "💳": CreditCard, "💸": HandCoins, "🪙": Coins, "🛒": ShoppingCart, "🛍": ShoppingBag,
  "📦": Package, "🚚": Truck, "🎟": Ticket, "📈": TrendingUp, "📊": ChartColumn,
  // Getting around
  "🚗": Car, "🚕": CarTaxiFront, "🚌": Bus, "✈": Plane, "🛫": PlaneTakeoff, "📍": MapPin, "🗺": Map,
  "🌐": Globe, "🌎": Earth, "🌍": Earth,
  // Food
  "🍔": Hamburger, "🥐": Croissant, "☕": Coffee, "🥪": Sandwich, "🥦": Salad, "🥕": Carrot, "🍎": Apple,
  "🍊": Citrus, "🧁": CakeSlice, "🍭": Candy, "🥫": Soup,
  // Nature and weather
  "🌲": TreePine, "🌱": Sprout, "🍃": Leaf, "🌸": Flower, "🌻": Flower2, "🌧": CloudRain, "☔": Umbrella,
  "💧": Droplet, "🐢": Turtle, "🐹": Rabbit, "♻": Recycle,
  // Things and tools
  "💻": Laptop, "📱": Smartphone, "📶": Signal, "🔋": BatteryFull, "🔔": Bell, "🔊": Volume2,
  "🔇": VolumeX, "🎵": Music, "📸": Camera, "🎨": Palette, "🎮": Gamepad2, "🧩": Puzzle, "🧱": Blocks,
  "🔧": Wrench, "🛠": Hammer, "🐞": Bug, "🔬": Microscope, "🧪": FlaskConical, "🧬": Dna, "📏": Ruler,
  "📐": DraftingCompass, "⚖": Scale, "🔒": Lock, "🔍": Search, "🔎": Search, "⬇": Download,
  "🔄": RefreshCw, "🪜": Footprints, "🛋": Sofa, "🪑": Armchair, "🎩": Crown, "🚧": Construction,
  "💡": Lightbulb,
  // Signs and rewards
  "⭐": Star, "✨": Sparkles, "⚡": Zap, "🔥": Flame, "🎯": Target, "🏆": Trophy, "🏅": Medal,
  "🥇": Medal, "🥈": Medal, "🥉": Medal, "🎉": PartyPopper, "🎁": Gift, "🚩": Flag, "🏳": Flag,
  "🏁": Goal, "✅": CircleCheck, "💯": BadgeCheck, "🚫": Ban, "❓": CircleHelp, "💜": Heart, "♥": Heart,
  // Others Pipo (the model) often starts an answer line with
  "💰": Wallet, "🐷": PiggyBank, "🏦": Landmark, "💲": DollarSign, "💴": JapaneseYen, "💶": Euro,
  "🧮": Calculator, "🎂": Cake, "🍰": CakeSlice, "🍕": Pizza, "🌭": Beef, "🥩": Beef, "🍗": Drumstick,
  "🍖": Ham, "🐟": Fish, "🍣": Fish, "🥗": Salad, "🍽": Utensils, "🍴": Utensils, "🥤": CupSoda,
  "🧃": CupSoda, "🥛": Milk, "🍷": Wine, "🍺": Beer, "💦": Droplets, "🍳": EggFried, "🥚": Egg, "🍞": Wheat,
  "🌾": Wheat, "🍦": IceCreamCone, "🍨": IceCreamCone, "🍪": Cookie, "🍩": Donut, "🍫": Candy, "🍬": Candy,
  "🍿": Popcorn, "🍇": Grape, "🍒": Cherry, "🍌": Banana, "🍓": Cherry, "🍲": CookingPot, "🥘": CookingPot,
  "🍜": Soup, "🌽": Wheat, "🧺": ShoppingBasket, "🌮": Sandwich, "🌯": Sandwich, "🥙": Sandwich,
  "🍟": Hamburger, "📌": Pin, "⚠": TriangleAlert, "❗": CircleAlert, "‼": CircleAlert, "ℹ": Info,
  "🛑": OctagonAlert, "❌": X, "✖": X, "✔": Check, "☑": SquareCheck, "➡": ArrowRight, "⬆": ArrowUp, "🔗": Link,
  "➕": Plus, "➖": Minus, "❤": Heart, "🧡": Heart, "💛": Heart, "💚": Heart, "💙": Heart, "🤍": Heart,
  "💖": Heart, "💕": Heart, "👍": ThumbsUp, "👌": ThumbsUp, "🙏": HandHeart, "👋": Hand, "👏": PartyPopper,
  "🥳": PartyPopper, "🎊": PartyPopper, "🎈": PartyPopper, "😊": Smile, "😀": Smile, "😃": Smile, "😄": Smile,
  "😁": Laugh, "😂": Laugh, "😅": Laugh, "🤗": Smile, "😉": Smile, "😍": Smile, "🤔": Brain, "🧠": Brain,
  "😢": Frown, "😟": Frown, "😐": Meh, "🗒": StickyNote, "📒": Notebook, "📓": NotebookText, "📗": BookOpen,
  "📘": BookOpen, "📕": BookOpen, "📑": Bookmark, "🗂": FolderOpen, "📁": Folder, "📂": FolderOpen,
  "🗃": Archive, "📥": Inbox, "📬": Mailbox, "📮": Mailbox, "🖨": Printer, "⌨": Keyboard, "🖱": Mouse,
  "🖥": Monitor, "📺": Tv, "⌚": Watch, "🎧": Headphones, "📻": Radio, "📹": Video, "🎥": Video,
  "🎬": Clapperboard, "🎞": Film, "🖼": Image, "📰": Newspaper, "🗑": Trash2, "🧹": Brush, "🖌": Paintbrush,
  "✂": Scissors, "🔨": Hammer, "🔌": Plug, "⚙": Settings, "🔑": Key, "🗝": Key, "🔓": LockOpen, "🛡": Shield,
  "🆔": IdCard, "🪪": IdCard, "💪": Dumbbell, "🏋": Dumbbell, "🏃": PersonStanding, "🚶": Footprints,
  "👟": Footprints, "👕": Shirt, "👔": Shirt, "👓": Glasses, "💎": Gem, "👑": Crown, "🎖": Award, "🏵": Award,
  "🎗": Award, "🚲": Bike, "🚆": TrainFront, "🚇": TrainFront, "🚢": Ship, "⛽": Fuel, "🅿": CircleParking,
  "🧭": Compass, "🛣": Route, "🏪": Store, "🏬": Store, "🏢": Building, "🏭": Factory, "⛪": Church,
  "🏰": Castle, "🏥": Hospital, "⛺": Tent, "🏕": Tent, "⛰": Mountain, "🏔": Mountain, "🌊": Waves,
  "🏖": Waves, "🏝": Trees, "🌳": Trees, "🌴": Trees, "🌷": Flower, "🌹": Flower, "🌼": Flower2, "🐶": Dog,
  "🐕": Dog, "🐱": Cat, "🐈": Cat, "🐦": Bird, "🐰": Rabbit, "🐾": PawPrint, "🐛": Bug, "💊": Pill,
  "🩺": Stethoscope, "🩹": HeartPulse, "😷": Thermometer, "🚑": Siren, "🚨": Siren, "🛏": Bed, "🛁": Bath,
  "🚿": ShowerHead, "💤": Bed, "🌞": Sun, "🌤": CloudSun, "⛅": CloudSun, "☁": Cloud, "❄": Snowflake,
  "🌬": Wind, "🌈": CloudSun, "🌇": Sunset, "🌆": Sunset, "⌛": Hourglass, "⏲": Timer, "🕐": Clock,
  "🕑": Clock, "🕒": Clock, "🕔": Clock, "🕖": Clock, "🕘": Clock, "🕚": Clock, "🕛": Clock, "🎶": Music2,
  "🎸": Guitar, "🎹": Piano, "🥁": Drum, "🎲": Dices, "🕹": Gamepad, "⚽": Volleyball, "🏀": Volleyball,
  "🏐": Volleyball, "📉": ChartLine, "🥧": ChartPie, "💹": ChartLine, "🔢": Calculator, "📃": FileText,
  "🧷": Paperclip, "🖊": PenTool, "🖋": PenTool, "👶": Baby, "🧑": User, "👨": User, "👩": User, "🧔": User,
  "👦": UserRound, "🧓": UserRound, "👴": UserRound, "🫂": HeartHandshake, "🧸": Gift, "📲": Smartphone,
  "☎": Phone, "📟": Smartphone, "📡": Signal, "🛜": Wifi, "🔐": Lock, "🧯": Siren,
};

/** The key for an emoji: variation selectors dropped, so "✈️" and "✈" match. */
const keyOf = (emoji: string) => emoji.replace(/️/g, "").trim();

/** True when this emoji (or its first part) has an icon of its own, not the sparkle fallback. */
export function hasIcon(emoji: string): boolean {
  const key = keyOf(emoji);
  return key in ICONS || ([...key][0] ?? "") in ICONS;
}

export function iconFor(emoji: string): LucideIcon {
  const key = keyOf(emoji);
  // "🙋‍♀️" has no icon of its own, so it falls back to its first part, "🙋".
  return ICONS[key] ?? ICONS[[...key][0] ?? ""] ?? Sparkles;
}

/** The line icon for an emoji key. Decorative: hidden from screen readers, like the emoji was. */
export function Glyph({ e, size = "1em", strokeWidth = 2.25, ...rest }: { e: string } & LucideProps) {
  const Icon = iconFor(e);
  return <Icon aria-hidden="true" size={size} strokeWidth={strokeWidth} {...rest} />;
}

/**
 * A bigger icon in a small glowing tile, for cards and map spots (where a big emoji used to sit).
 * `tone` picks the tile: brand violet by default, amber for rewards, white glass on dark.
 */
export function GlyphTile({
  e,
  className = "",
  tone = "brand",
}: {
  e: string;
  className?: string;
  tone?: "brand" | "amber" | "glass" | "muted";
}) {
  const tones = {
    brand: "bg-linear-to-br from-brand-500 to-indigo-600 text-white shadow-[0_6px_18px_-6px] shadow-brand-500/70 ring-1 ring-white/25",
    amber: "bg-linear-to-br from-amber-300 to-orange-400 text-amber-950 shadow-[0_6px_18px_-6px] shadow-orange-400/70 ring-1 ring-white/40",
    glass: "bg-white/10 text-white ring-1 ring-white/20 backdrop-blur",
    muted: "bg-gray-200 text-gray-500",
  } as const;
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-[30%] ${tones[tone]} ${className}`} aria-hidden="true">
      <Glyph e={e} size="55%" />
    </span>
  );
}

export { stripEmoji } from "../game/emoji.ts";
