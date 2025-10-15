"use client";

import { Users, Target, Award, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const AboutClient = () => {
  const { t } = useLanguage();

  const values = [
    {
      icon: Target,
      title: t("about.values.mission.title"),
      description: t("about.values.mission.desc"),
    },
    {
      icon: Users,
      title: t("about.values.customer.title"),
      description: t("about.values.customer.desc"),
    },
    {
      icon: Award,
      title: t("about.values.quality.title"),
      description: t("about.values.quality.desc"),
    },
    {
      icon: Globe,
      title: t("about.values.local.title"),
      description: t("about.values.local.desc"),
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-orange-500 to-blue-500 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            {t("about.title")}
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            {t("about.hero")}
          </p>
        </div>
      </section>

      <section className="p-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">{t("about.storyTitle")}</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>{t("about.story1")}</p>
                <p>{t("about.story2")}</p>
                <p>{t("about.story3")}</p>
              </div>
            </div>
            <div>
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop"
                alt={t("about.teamworkImgAlt")}
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="p-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("about.valuesTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("about.valuesDesc")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                    <value.icon className="h-8 w-8 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutClient;
