import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Laptop,
  HardDrive,
  Printer,
  Wifi,
  Monitor,
  Keyboard,
  Mouse,
  Smartphone,
  Tablet,
  Headphones,
  Camera,
  Wrench,
  Settings,
  User,
  Users,
  FileText,
  Folder,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  MapPin,
  Home,
  Building,
  Package,
  ShoppingCart,
  CreditCard,
  DollarSign,
  BarChart,
  PieChart,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  HelpCircle,
  Star,
  Heart,
  Bookmark,
  Tag,
  Search,
  Filter,
  Download,
  Upload,
  Share,
  Edit,
  Trash,
  Plus,
  Minus,
  X,
  Check,
  ChevronRight,
} from 'lucide-react';

const ICON_OPTIONS = [
  { name: 'Laptop', icon: Laptop },
  { name: 'HardDrive', icon: HardDrive },
  { name: 'Printer', icon: Printer },
  { name: 'Wifi', icon: Wifi },
  { name: 'Monitor', icon: Monitor },
  { name: 'Keyboard', icon: Keyboard },
  { name: 'Mouse', icon: Mouse },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Tablet', icon: Tablet },
  { name: 'Headphones', icon: Headphones },
  { name: 'Camera', icon: Camera },
  { name: 'Wrench', icon: Wrench },
  { name: 'Settings', icon: Settings },
  { name: 'User', icon: User },
  { name: 'Users', icon: Users },
  { name: 'FileText', icon: FileText },
  { name: 'Folder', icon: Folder },
  { name: 'Mail', icon: Mail },
  { name: 'Phone', icon: Phone },
  { name: 'MessageSquare', icon: MessageSquare },
  { name: 'Calendar', icon: Calendar },
  { name: 'Clock', icon: Clock },
  { name: 'MapPin', icon: MapPin },
  { name: 'Home', icon: Home },
  { name: 'Building', icon: Building },
  { name: 'Package', icon: Package },
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'DollarSign', icon: DollarSign },
  { name: 'BarChart', icon: BarChart },
  { name: 'PieChart', icon: PieChart },
  { name: 'TrendingUp', icon: TrendingUp },
  { name: 'AlertCircle', icon: AlertCircle },
  { name: 'CheckCircle', icon: CheckCircle },
  { name: 'XCircle', icon: XCircle },
  { name: 'Info', icon: Info },
  { name: 'HelpCircle', icon: HelpCircle },
  { name: 'Star', icon: Star },
  { name: 'Heart', icon: Heart },
  { name: 'Bookmark', icon: Bookmark },
  { name: 'Tag', icon: Tag },
  { name: 'Search', icon: Search },
  { name: 'Filter', icon: Filter },
  { name: 'Download', icon: Download },
  { name: 'Upload', icon: Upload },
  { name: 'Share', icon: Share },
  { name: 'Edit', icon: Edit },
  { name: 'Trash', icon: Trash },
  { name: 'Plus', icon: Plus },
  { name: 'Minus', icon: Minus },
  { name: 'X', icon: X },
  { name: 'Check', icon: Check },
  { name: 'ChevronRight', icon: ChevronRight },
];

interface IconSelectorProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconSelector({ value, onChange }: IconSelectorProps) {
  const SelectedIcon = ICON_OPTIONS.find(opt => opt.name === value)?.icon || FileText;

  return (
    <div className="space-y-2">
      <Label>Icon</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <SelectedIcon className="w-4 h-4 mr-2" />
            {value || 'Select icon'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid grid-cols-6 gap-2">
            {ICON_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.name}
                  variant={value === option.name ? 'default' : 'ghost'}
                  size="sm"
                  className="h-10 w-10 p-0"
                  onClick={() => onChange(option.name)}
                  title={option.name}
                >
                  <Icon className="w-4 h-4" />
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
