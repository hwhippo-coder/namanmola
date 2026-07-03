import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://namanmola.co.kr',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // 나중에 상세페이지(예: /event/1)가 생기면 여기에 추가하여 자동으로 지도를 확장할 수 있습니다.
  ];
}