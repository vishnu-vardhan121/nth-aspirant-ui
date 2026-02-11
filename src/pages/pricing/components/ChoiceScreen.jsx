import { motion } from 'framer-motion';

export default function ChoiceScreen({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6">
      <motion.h1
        className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        Choose your track
      </motion.h1>
      <motion.p
        className="text-slate-400 mb-8 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        Who is this for?
      </motion.p>
      <div className="flex flex-col sm:flex-row gap-4">
        <motion.button
          type="button"
          onClick={() => onSelect('fresher')}
          className="px-10 py-4 rounded-xl font-semibold text-white text-lg min-w-[180px] transition-all"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--nth-primary)) 0%, rgb(var(--nth-primary-light)) 100%)',
            boxShadow: '0 4px 24px rgb(var(--nth-primary) / 0.35)',
          }}
          whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgb(var(--nth-primary) / 0.45)' }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          Fresher
        </motion.button>
        <motion.button
          type="button"
          onClick={() => onSelect('experienced')}
          className="px-10 py-4 rounded-xl font-semibold text-lg min-w-[180px] border border-slate-500 bg-white/5 text-white hover:bg-white/10 hover:border-indigo-500/50 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          Experienced
        </motion.button>
      </div>
    </div>
  );
}
