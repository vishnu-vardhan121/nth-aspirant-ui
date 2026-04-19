import { motion } from 'framer-motion';
import { HiCheck } from 'react-icons/hi2';

function PlanCard({ plan, index, onSelectPlan }) {
  const isPopular = plan.popular;

  const handleClick = () => {
    if (plan.ctaDisabled) return;
    onSelectPlan?.(plan);
  };

  return (
    <motion.div
      className={`relative flex flex-col rounded-2xl p-5 sm:p-6 border ${
        isPopular
          ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
          : 'bg-white/5 border-white/10'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      {isPopular && (
        <span className="absolute top-0 right-0 rounded-bl-lg rounded-tr-2xl bg-indigo-500 text-white text-xs font-semibold px-3 py-1">
          POPULAR
        </span>
      )}
      <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
      <div className="flex items-baseline gap-0.5 mb-1">
        <span className="text-2xl font-bold text-white">{plan.price}</span>
        <span className="text-slate-400 text-sm">{plan.priceNote}</span>
      </div>
      <p className="text-slate-400 text-sm mb-3 min-h-[36px]">{plan.description}</p>
      <ul className="space-y-1.5 flex-1 min-h-0 overflow-auto mb-4">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-slate-300 text-xs sm:text-sm">
            <HiCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-emerald-400 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {plan.ctaNote ? (
        <p className="text-slate-400 text-xs sm:text-sm leading-snug mb-3">{plan.ctaNote}</p>
      ) : null}
      <button
        type="button"
        disabled={plan.ctaDisabled}
        onClick={handleClick}
        className={`mt-auto w-full py-3 rounded-xl font-semibold text-sm transition-all ${
          plan.ctaDisabled
            ? 'bg-white/10 text-slate-500 cursor-not-allowed'
            : 'text-white hover:opacity-90'
        }`}
        style={
          !plan.ctaDisabled
            ? {
                background:
                  'linear-gradient(135deg, hsl(var(--nth-primary)) 0%, hsl(var(--nth-primary-light)) 100%)',
                boxShadow: '0 4px 20px hsl(var(--nth-primary) / 0.4)',
              }
            : undefined
        }
      >
        {plan.ctaText}
      </button>
    </motion.div>
  );
}

export default function PricingCards({ plans, track, onSelectPlan }) {
  return (
    <div className="flex flex-col flex-1 px-4 sm:px-6 pt-14 sm:pt-16 overflow-auto min-h-0">
      <div className="flex items-center justify-center mb-6">
        <motion.h1
          className="text-xl sm:text-2xl font-bold text-white text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          Upgrade your plan
        </motion.h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {plans.map((plan, index) => (
          <PlanCard key={plan.id} plan={plan} index={index} onSelectPlan={onSelectPlan} />
        ))}
      </div>
    </div>
  );
}
