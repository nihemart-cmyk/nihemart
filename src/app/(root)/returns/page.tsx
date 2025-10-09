'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

const ReturnAndRefundPolicy = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 to-blue-600 py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-lg"
          >
            {t('returnTitle')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-white/90 max-w-3xl mx-auto leading-relaxed"
          >
            {t('returnHero')}
          </motion.p>
        </div>
      </section>

      {/* Terms Section */}
      <section className="px-4 md:px-8 lg:px-16 py-12 bg-white">
        <div className="container mx-auto">
          <Card className="shadow-xl rounded-2xl border border-gray-100">
            <CardContent className="p-6 md:p-10">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
                {t('termsTitle')}
              </h2>
              <ul className="space-y-6 text-gray-700 text-base leading-relaxed">
                <li>
                  <span className="font-medium text-gray-900">
                    {t('termsCondition1Title')}
                  </span>
                  : {t('termsCondition1Desc')}
                </li>
                <li>
                  <span className="font-medium text-gray-900">
                    {t('termsCondition2Title')}
                  </span>
                  : {t('termsCondition2Desc')}
                </li>
                <li>
                  <span className="font-medium text-gray-900">
                    {t('termsCondition3Title')}
                  </span>
                  : {t('termsCondition3Desc')}
                </li>
                <li>
                  <span className="font-medium text-gray-900">
                    {t('termsCondition4Title')}
                  </span>
                  : {t('termsCondition4Desc')}
                </li>
                <li>
                  <span className="font-medium text-gray-900">
                    {t('termsCondition5Title')}
                  </span>
                  : {t('termsCondition5Desc')}
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Refund Section */}
      <section className="px-4 md:px-8 lg:px-16 py-12 bg-neutral-100">
        <div className="container mx-auto">
          <Card className="shadow-xl rounded-2xl border border-gray-100">
            <CardContent className="p-6 md:p-10">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
                {t('refundTitle')}
              </h2>
              <ul className="space-y-6 text-gray-700 text-base leading-relaxed">
                <li>
                  <span className="font-medium text-gray-900">
                    {t('refundCondition1Title')}
                  </span>
                  : {t('refundCondition1Desc')}
                </li>
                <li>
                  <span className="font-medium text-gray-900">
                    {t('refundCondition2Title')}
                  </span>
                  : {t('refundCondition2Desc')}
                </li>
                <li>
                  <span className="font-medium text-gray-900">
                    {t('refundCondition3Title')}
                  </span>
                  : {t('refundCondition3Desc')}
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section className="px-4 md:px-8 lg:px-16 py-16 bg-white">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
            {t('contactTitle')}
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t('contactDesc')}
          </p>
          <p className="text-base md:text-lg text-gray-800">
            <span className="font-medium">{t('supportEmailLabel')}:</span>{' '}
            <a
              href="mailto:nihemart@gmail.com"
              className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
            >
              nihemart@gmail.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
};

export default ReturnAndRefundPolicy;