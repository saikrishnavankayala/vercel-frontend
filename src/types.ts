export type Prize = {
  id: string
  title: string
  description: string
  label: string
  weight?: number
  color?: string
  icon?: string
  image: string
  segmentIndex?: number
}

export type Customer = {
  mobile: string
  name: string
  address: string
  facebookCompleted: boolean
  instagramCompleted: boolean
  whatsappCompleted: boolean
  socialComplete: boolean
  hasSpun?: boolean
  reward?: Prize
  createdAt: string
  spinDate?: string
}
