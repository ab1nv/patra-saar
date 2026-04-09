export interface SourceConfig {
  filename: string
  title: string
  sourceType: 'central_act' | 'state_act' | 'model_act' | 'rules'
  jurisdiction: string
  year: number
}

export interface CategoryConfig {
  id: string
  slug: string
  name: string
  description: string
  sources: SourceConfig[]
}

export const CATEGORIES: CategoryConfig[] = [
  {
    id: 'cat_rental',
    slug: 'rental-tenancy',
    name: 'Rental & Tenancy Law',
    description:
      'Indian rental and tenancy laws including TPA, Model Tenancy Act, and state-specific rent control acts',
    sources: [
      {
        filename: 'transfer-of-property-act-1882.txt',
        title: 'Transfer of Property Act, 1882 (Sections 105-117)',
        sourceType: 'central_act',
        jurisdiction: 'central',
        year: 1882,
      },
      {
        filename: 'model-tenancy-act-2021.txt',
        title: 'Model Tenancy Act, 2021',
        sourceType: 'model_act',
        jurisdiction: 'central',
        year: 2021,
      },
      {
        filename: 'delhi-rent-control-act-1958.txt',
        title: 'Delhi Rent Control Act, 1958',
        sourceType: 'state_act',
        jurisdiction: 'delhi',
        year: 1958,
      },
      {
        filename: 'maharashtra-rent-control-act-1999.txt',
        title: 'Maharashtra Rent Control Act, 1999',
        sourceType: 'state_act',
        jurisdiction: 'maharashtra',
        year: 1999,
      },
      {
        filename: 'karnataka-rent-act-1999.txt',
        title: 'Karnataka Rent Act, 1999',
        sourceType: 'state_act',
        jurisdiction: 'karnataka',
        year: 1999,
      },
      {
        filename: 'registration-act-1908-relevant.txt',
        title: 'Registration Act, 1908 (Relevant Sections)',
        sourceType: 'central_act',
        jurisdiction: 'central',
        year: 1908,
      },
      {
        filename: 'indian-stamp-act-1899-relevant.txt',
        title: 'Indian Stamp Act, 1899 (Relevant Sections)',
        sourceType: 'central_act',
        jurisdiction: 'central',
        year: 1899,
      },
    ],
  },
]
