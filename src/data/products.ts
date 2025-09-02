import { Product, Category } from '../../types';

export const categories: Category[] = [
  {
    id: 'laptops',
    name: 'Laptops',
    subcategories: ['Gaming Laptops', 'Business Laptops', 'Ultrabooks', '2-in-1 Laptops']
  },
  {
    id: 'desktops',
    name: 'Desktops',
    subcategories: ['Gaming PCs', 'Workstations', 'All-in-One', 'Mini PCs']
  },
  {
    id: 'components',
    name: 'Components',
    subcategories: ['Processors', 'Graphics Cards', 'Memory', 'Storage', 'Motherboards']
  },
  {
    id: 'peripherals',
    name: 'Peripherals',
    subcategories: ['Keyboards', 'Mice', 'Monitors', 'Audio', 'Webcams']
  },
  {
    id: 'accessories',
    name: 'Accessories',
    subcategories: ['Cables', 'Cases', 'Cooling', 'Power Supplies', 'Networking']
  }
];

export const products: Product[] = [
  {
    id: '1',
    name: 'MacBook Pro 16" M3 Max',
    price: 3499,
    originalPrice: 3999,
    image: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=500',
    category: 'laptops',
    subcategory: 'Ultrabooks',
    rating: 4.8,
    reviewCount: 2847,
    description: 'The most powerful MacBook Pro ever, featuring the M3 Max chip with incredible performance for professionals.',
    specifications: {
      'Display': '16.2" Liquid Retina XDR',
      'Processor': 'Apple M3 Max',
      'Memory': '32GB Unified Memory',
      'Storage': '1TB SSD',
      'Graphics': 'M3 Max GPU',
      'Battery': 'Up to 22 hours'
    },
    inStock: true,
    featured: true,
    bestseller: true,
    stockLevel: 'high'
  },
  {
    id: '2',
    name: 'Gaming Desktop RTX 4080',
    price: 2299,
    image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=500',
    category: 'desktops',
    subcategory: 'Gaming PCs',
    rating: 4.7,
    reviewCount: 1923,
    description: 'High-performance gaming desktop with RTX 4080 graphics card and Intel Core i7 processor.',
    specifications: {
      'Processor': 'Intel Core i7-13700KF',
      'Graphics': 'NVIDIA RTX 4080 16GB',
      'Memory': '32GB DDR5-5600',
      'Storage': '1TB NVMe SSD',
      'Motherboard': 'Z790 Chipset',
      'Power': '850W 80+ Gold'
    },
    inStock: true,
    featured: true,
    stockLevel: 'high'
  },
  {
    id: '3',
    name: 'Mechanical Gaming Keyboard',
    price: 149,
    originalPrice: 199,
    image: 'https://images.pexels.com/photos/1194713/pexels-photo-1194713.jpeg?auto=compress&cs=tinysrgb&w=500',
    category: 'peripherals',
    subcategory: 'Keyboards',
    rating: 4.6,
    reviewCount: 5847,
    description: 'Premium mechanical keyboard with RGB backlighting and customizable switches.',
    specifications: {
      'Switch Type': 'Cherry MX Blue',
      'Backlighting': 'RGB Per-Key',
      'Layout': 'Full Size (104 keys)',
      'Connectivity': 'Wired USB-C',
      'Features': 'Hot-swappable switches',
      'Compatibility': 'Windows, Mac, Linux'
    },
    inStock: true,
    bestseller: true,
    stockLevel: 'limited'
  },
  {
    id: '4',
    name: '4K Gaming Monitor 32"',
    price: 799,
    image: 'https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&cs=tinysrgb&w=500',
    category: 'peripherals',
    subcategory: 'Monitors',
    rating: 4.5,
    reviewCount: 3421,
    description: '32-inch 4K gaming monitor with 144Hz refresh rate and HDR support.',
    specifications: {
      'Size': '32 inches',
      'Resolution': '3840 x 2160 (4K UHD)',
      'Refresh Rate': '144Hz',
      'Panel Type': 'IPS',
      'Response Time': '1ms GTG',
      'HDR': 'HDR10 Support'
    },
    inStock: true,
    stockLevel: 'high'
  },
  {
    id: '5',
    name: 'NVIDIA RTX 4090 Graphics Card',
    price: 1599,
    image: 'https://images.pexels.com/photos/2582928/pexels-photo-2582928.jpeg?auto=compress&cs=tinysrgb&w=500',
    category: 'components',
    subcategory: 'Graphics Cards',
    rating: 4.9,
    reviewCount: 1245,
    description: 'The ultimate graphics card for 4K gaming and content creation.',
    specifications: {
      'GPU': 'NVIDIA RTX 4090',
      'Memory': '24GB GDDR6X',
      'Base Clock': '2205 MHz',
      'Boost Clock': '2520 MHz',
      'Memory Interface': '384-bit',
      'Power Consumption': '450W'
    },
    inStock: true,
    featured: true,
    stockLevel: 'limited'
  },
  {
    id: '6',
    name: 'Wireless Gaming Mouse',
    price: 89,
    originalPrice: 119,
    image: 'https://images.pexels.com/photos/2115256/pexels-photo-2115256.jpeg?auto=compress&cs=tinysrgb&w=500',
    category: 'peripherals',
    subcategory: 'Mice',
    rating: 4.4,
    reviewCount: 7892,
    description: 'High-precision wireless gaming mouse with customizable RGB lighting.',
    specifications: {
      'DPI': 'Up to 25,600 DPI',
      'Sensor': 'Optical Gaming Sensor',
      'Connectivity': 'Wireless 2.4GHz',
      'Battery': 'Up to 70 hours',
      'Buttons': '11 programmable buttons',
      'Weight': '99g'
    },
    inStock: true,
    bestseller: true,
    stockLevel: 'high'
  },
  {
    id: '7',
    name: 'Business Laptop 14"',
    price: 1299,
    image: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=500',
    category: 'laptops',
    subcategory: 'Business Laptops',
    rating: 4.3,
    reviewCount: 2156,
    description: 'Professional business laptop with enterprise security features.',
    specifications: {
      'Display': '14" Full HD IPS',
      'Processor': 'Intel Core i7-1365U',
      'Memory': '16GB LPDDR5',
      'Storage': '512GB SSD',
      'Graphics': 'Intel Iris Xe',
      'Battery': 'Up to 15 hours'
    },
    inStock: true,
    stockLevel: 'high'
  },
  {
    id: '8',
    name: 'All-in-One Desktop 27"',
    price: 1799,
    image: 'https://images.pexels.com/photos/442150/pexels-photo-442150.jpeg?auto=compress&cs=tinysrgb&w=500',
    category: 'desktops',
    subcategory: 'All-in-One',
    rating: 4.2,
    reviewCount: 892,
    description: 'Sleek all-in-one desktop with 27-inch 4K display and powerful performance.',
    specifications: {
      'Display': '27" 4K UHD Touchscreen',
      'Processor': 'AMD Ryzen 7 7700HS',
      'Memory': '16GB DDR5',
      'Storage': '1TB SSD',
      'Graphics': 'Radeon 780M',
      'Audio': 'Stereo speakers with subwoofer'
    },
    inStock: false,
    stockLevel: 'out'
  }
];