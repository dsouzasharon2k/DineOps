import { useState } from 'react'
import { formatCurrency } from '../utils/currency'

export type DietType = 'veg' | 'non-veg' | 'vegan'

export interface NutritionRow {
  label: string
  per100g: string
  perServing: string
}

export interface FoodItemCardData {
  id: string
  name: string
  dietType: DietType
  price: number
  description: string
  servingSize: string
  imageUrl?: string
  flavourProfile: string[]
  allergens: string[]
  ingredients: string
  nutrition: NutritionRow[]
}

interface FoodItemCardProps {
  item: FoodItemCardData
  quantity: number
  disabled?: boolean
  onAdd: () => void
  onRemove: () => void
}

const DietBadge = ({ type }: { type: DietType }) => {
  const config = {
    veg: { border: '#22a45d', dot: '#22a45d', label: 'Veg' },
    'non-veg': { border: '#e63b3b', dot: '#e63b3b', label: 'Non-veg' },
    vegan: { border: '#16803c', dot: '#16803c', label: 'Vegan' },
  }[type]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide"
      style={{ color: config.border }}
    >
      <span
        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border-[1.5px]"
        style={{ borderColor: config.border, borderRadius: type === 'vegan' ? '50%' : 2 }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: config.dot }} />
      </span>
      {config.label}
    </span>
  )
}

const Section = ({
  label,
  children,
  noBorder,
}: {
  label: string
  children: React.ReactNode
  noBorder?: boolean
}) => (
  <div className={noBorder ? 'mb-5' : 'mb-5 border-b border-stone-100 pb-5'}>
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400">{label}</p>
    {children}
  </div>
)

const Chip = ({ children, warn }: { children: React.ReactNode; warn?: boolean }) => (
  <span
    className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
      warn ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-stone-200 bg-stone-50 text-stone-600'
    }`}
  >
    {children}
  </span>
)

const ExpandedCard = ({
  item,
  quantity,
  onClose,
  onAdd,
  onRemove,
  disabled,
}: {
  item: FoodItemCardData
  quantity: number
  onClose: () => void
  onAdd: () => void
  onRemove: () => void
  disabled?: boolean
}) => (
  <div
    onClick={onClose}
    className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/55 backdrop-blur-sm"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-[520px] max-h-[92dvh] overflow-y-auto rounded-t-[20px] bg-white shadow-2xl"
    >
      <div className="relative">
        <div
          className="h-52 w-full rounded-t-[20px] bg-cover bg-center"
          style={{
            backgroundImage: item.imageUrl
              ? `url(${item.imageUrl})`
              : 'linear-gradient(135deg, #fed7aa 0%, #fbbf24 100%)',
          }}
        />
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white"
        >
          ✕
        </button>
        <div className="absolute -bottom-4 left-5 rounded-full bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/35">
          {formatCurrency(item.price)}
        </div>
      </div>

      <div className="px-6 pb-8 pt-7">
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold text-stone-900">{item.name}</h2>
          <DietBadge type={item.dietType} />
        </div>
        <p className="mb-5 text-xs text-stone-400">Serving size: {item.servingSize || '—'}</p>

        <Section label="Flavour profile">
          <div className="flex flex-wrap gap-1.5">
            {item.flavourProfile?.length ? (
              item.flavourProfile.map((f) => <Chip key={f}>{f}</Chip>)
            ) : (
              <span className="text-sm text-stone-500">Not specified</span>
            )}
          </div>
        </Section>

        <Section label="Allergen declaration">
          <div className="flex flex-wrap gap-1.5">
            {item.allergens?.length ? (
              item.allergens.map((a) => <Chip key={a} warn>{a}</Chip>)
            ) : (
              <span className="text-sm text-stone-500">No common allergens declared</span>
            )}
          </div>
        </Section>

        <Section label="Ingredients">
          <p className="text-sm leading-relaxed text-stone-600">{item.ingredients || 'Not specified.'}</p>
        </Section>

        <Section label="Nutritional information" noBorder>
          {item.nutrition?.length ? (
            <>
              <div className="overflow-hidden rounded-lg border border-stone-200">
                <div className="grid grid-cols-[1fr_80px_80px] border-b border-stone-200 bg-stone-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  <span>Nutrient</span>
                  <span className="text-right">Per 100g</span>
                  <span className="text-right">Per serving</span>
                </div>
                {item.nutrition.map((row, i) => (
                  <div
                    key={row.label}
                    className={`grid grid-cols-[1fr_80px_80px] px-3 py-2.5 text-sm ${
                      i % 2 === 0 ? 'bg-white' : 'bg-stone-50'
                    }`}
                  >
                    <span className="text-stone-800">{row.label}</span>
                    <span className="text-right text-stone-500">{row.per100g}</span>
                    <span className="text-right text-stone-500">{row.perServing}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-stone-400">
                * Approximate values. Nutritional content may vary with preparation.
              </p>
            </>
          ) : (
            <p className="text-sm text-stone-500">Not specified.</p>
          )}
        </Section>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-stone-100 bg-white p-4">
        {quantity === 0 ? (
          <button
            onClick={() => !disabled && onAdd()}
            disabled={disabled}
            className="flex-1 rounded-xl bg-orange-500 py-3.5 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to order · {formatCurrency(item.price)}
          </button>
        ) : (
          <>
            <div className="flex items-center overflow-hidden rounded-xl border-[1.5px] border-orange-200 bg-orange-50">
              <button
                onClick={onRemove}
                className="flex h-12 w-11 items-center justify-center text-xl font-semibold text-orange-500 hover:bg-orange-100"
              >
                −
              </button>
              <span className="w-8 text-center text-base font-semibold text-stone-900">{quantity}</span>
              <button
                onClick={() => !disabled && onAdd()}
                disabled={disabled}
                className="flex h-12 w-11 items-center justify-center text-xl font-semibold text-orange-500 hover:bg-orange-100 disabled:opacity-50"
              >
                +
              </button>
            </div>
            <span className="flex-1 text-center text-sm font-semibold text-stone-700">
              {quantity} added · {formatCurrency(item.price * quantity)}
            </span>
          </>
        )}
      </div>
    </div>
  </div>
)

export function FoodItemCard({ item, quantity, disabled, onAdd, onRemove }: FoodItemCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div
        onClick={() => setExpanded(true)}
        className="food-card flex w-full max-w-[480px] cursor-pointer items-stretch gap-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1 p-4 pl-5">
          <DietBadge type={item.dietType} />
          <h3 className="mt-0.5 text-[15px] font-semibold leading-tight text-stone-900">{item.name}</h3>
          <p className="text-sm font-semibold text-orange-500">{formatCurrency(item.price)}</p>
          <p
            className="mt-0.5 line-clamp-2 text-xs text-stone-500"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {item.description || '—'}
          </p>
          {item.servingSize && <p className="mt-1 text-[11px] text-stone-400">{item.servingSize}</p>}
        </div>

        <div className="group relative flex w-28 flex-shrink-0 items-stretch overflow-hidden">
          <div
            className="card-image h-full min-h-[110px] w-full bg-cover bg-center transition-transform duration-300"
            style={{
              backgroundImage: item.imageUrl
                ? `url(${item.imageUrl})`
                : 'linear-gradient(135deg, #fed7aa 0%, #fbbf24 100%)',
            }}
          />
          {quantity === 0 ? (
            <button
              className="add-btn absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-white shadow-lg shadow-orange-500/40 transition hover:scale-105 hover:bg-orange-600 active:scale-95"
              onClick={(e) => {
                e.stopPropagation()
                if (!disabled) onAdd()
              }}
              disabled={disabled}
              aria-label={`Add ${item.name}`}
            >
              <span className="text-base leading-none">+</span>
            </button>
          ) : (
            <div
              className="add-btn absolute bottom-2.5 right-2.5 flex items-center overflow-hidden rounded-full border-2 border-white bg-orange-500 shadow-lg shadow-orange-500/40"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => !disabled && onRemove()}
                className="flex h-8 w-8 items-center justify-center text-white transition hover:bg-orange-600"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-bold text-white">{quantity}</span>
              <button
                onClick={() => !disabled && onAdd()}
                disabled={disabled}
                className="flex h-8 w-8 items-center justify-center text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <ExpandedCard
          item={item}
          quantity={quantity}
          onClose={() => setExpanded(false)}
          onAdd={onAdd}
          onRemove={onRemove}
          disabled={disabled}
        />
      )}
    </>
  )
}
