import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * تصدير ثابت: ينتج مجلد `out` فيه ملفات HTML/CSS/JS جاهزة للرفع على
   * Cloudflare Pages مباشرة — بلا خادم ولا adapters، وهو أبسط وأثبت خيار.
   *
   * ممكن هنا لأن التطبيق كله يعمل في المتصفح ويتصل بـ Supabase مباشرة،
   * فلا يحتاج أي كود على الخادم.
   */
  output: 'export',

  /** تحسين الصور يحتاج خادماً، ولا نستخدم صوراً خارجية أصلاً. */
  images: { unoptimized: true },

  /** يجعل كل صفحة مجلداً فيه index.html — أنسب لاستضافة الملفات الثابتة. */
  trailingSlash: true,
};

export default nextConfig;
