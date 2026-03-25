export const chatTypeOptions = [
  { value: 'ASKING_QUESTION', label: 'Asking Question', color: 'bg-blue-500', textClass: 'text-blue-800', badgeBg: 'bg-blue-100', badgeText: 'text-blue-800' },
  { value: 'ANSWERING_QUESTION', label: 'Answering Question', color: 'bg-green-500', textClass: 'text-green-800', badgeBg: 'bg-green-100', badgeText: 'text-green-800' },
  { value: 'GIVING_NEW_IDEA', label: 'Giving New Idea', color: 'bg-yellow-500', textClass: 'text-yellow-800', badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-800' },
  { value: 'DISPUTING_IDEAS', label: 'Disputing Ideas', color: 'bg-red-500', textClass: 'text-red-800', badgeBg: 'bg-red-100', badgeText: 'text-red-800' }
] as const;

export type ChatType = typeof chatTypeOptions[number]['value'];

export const chatTypeLabels: Record<ChatType, string> = chatTypeOptions.reduce((acc, opt) => {
  acc[opt.value] = opt.label;
  return acc;
}, {} as Record<ChatType, string>);

export const chatTypeColors: Record<ChatType, string> = chatTypeOptions.reduce((acc, opt) => {
  acc[opt.value] = opt.color;
  return acc;
}, {} as Record<ChatType, string>);

export const chatTypeTextClasses: Record<ChatType, string> = chatTypeOptions.reduce((acc, opt) => {
  acc[opt.value] = opt.textClass;
  return acc;
}, {} as Record<ChatType, string>);

export function getChatTypeColor(value: string): string {
  const option = chatTypeOptions.find(opt => opt.value === value);
  return option?.color || 'bg-gray-500';
}

export function getChatTypeTextClass(value: string): string {
  const option = chatTypeOptions.find(opt => opt.value === value);
  return option?.textClass || 'text-gray-800';
}

export function getChatTypeBadgeBg(value: string): string {
  const option = chatTypeOptions.find(opt => opt.value === value);
  return option?.badgeBg || 'bg-gray-100';
}

export function getChatTypeBadgeText(value: string): string {
  const option = chatTypeOptions.find(opt => opt.value === value);
  return option?.badgeText || 'text-gray-800';
}

export function getChatTypeLabel(value: string): string {
  const option = chatTypeOptions.find(opt => opt.value === value);
  return option?.label || value;
}
