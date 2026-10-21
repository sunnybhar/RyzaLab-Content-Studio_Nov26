export const channels = ['YouTube', 'LinkedIn', 'Instagram', 'TikTok', 'Facebook', 'Hub', 'Reddit'] as const;
export type Channel = typeof channels[number];
export type Status = 'Draft' | 'Needs changes' | 'Ryan review';
export interface Slide { title: string; body: string }
export interface Draft { id: string; title: string; channel: Channel; audience: string; format: string; content: string; slides: Slide[]; status: Status; created_at: string }
export interface Campaign { id: string; title: string; theme: string; brief: string; week: string }
export interface Issue { id: string; severity: string; message: string; suggest?: string }
export const formats: Record<Channel, string[]> = { YouTube:['Video talking points','Short script','Thumbnail concepts'], LinkedIn:['Founder post','Trade post','Carousel','Newsletter'], Instagram:['Reel script','Carousel','Caption'], TikTok:['Short video script','Caption','Comment reply'], Facebook:['Page post','Carousel','Group answer'], Hub:['Weekly brief','Newsletter','Repurposing plan'], Reddit:['Thread answer','Thread triage','Listening report'] };
