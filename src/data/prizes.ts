import type { Prize } from '../types'

export const prizes: Prize[] = [
  { id: 'accessories-50', title: '50% Discount on Accessories', description: 'Half price on eligible accessories during your next purchase.', label: '50% OFF', weight: 20, color: '#ffcc21', icon: '🎧', image: '/assets/accessories-50.svg' },
  { id: 'mobiles-5', title: '5% Discount on Mobiles', description: 'Save 5% on your next mobile purchase.', label: '5% MOBILES', color: '#f0671f', icon: '📱', image: '/assets/discount-5.svg' },
  { id: 'neckband-149', title: 'Buy @149/- Neck band', description: 'Get a Neck band for the special price of @149/-.', label: '@149 NECK', color: '#e61b23', icon: '🎧', image: '/assets/cable-offer.svg' },
  { id: 'tws-399', title: 'Buy @399/- TWS Buds', description: 'Get TWS Buds for the special price of @399/-.', label: '@399 TWS', color: '#65142f', icon: '🎶', image: '/assets/accessories-50.svg' },
  { id: 'watch-799', title: 'Buy @799/- Smart Watch', description: 'Get a Smart Watch for the special price of @799/-.', label: '@799 WATCH', color: '#c11f35', icon: '⌚', image: '/assets/discount-5.svg' },
  { id: 'glass-49', title: 'Buy @49/- Glass Protection', description: 'Get Glass Protection for the special price of @49/-.', label: '@49 GLASS', color: '#8c5420', icon: '🛡️', image: '/assets/tempered-glass.svg' },
]

export const selectPrize = (): Prize => {
  const total = prizes.reduce((sum, prize) => sum + (prize.weight ?? 0), 0)
  let cursor = Math.random() * total
  for (const prize of prizes) {
    cursor -= prize.weight ?? 0
    if (cursor <= 0) return prize
  }
  return prizes[0]
}
