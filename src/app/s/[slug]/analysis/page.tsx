'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SurveyAnalysisView from '@/components/analysis/SurveyAnalysisView';

export default function PublicSurveyAnalysisPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onlyValid, setOnlyValid] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchData = async (filterValid: boolean) => {
    try {
      const res = await fetch(`/api/public/survey/${slug}/analysis?onlyValid=${filterValid}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchData(onlyValid);
    }
  }, [slug, onlyValid]);

  const handleToggleStatus = async () => {
    if (!data?.survey?.id) return;
    const nextStatus = data.survey.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    setStatusLoading(true);

    try {
      const res = await fetch(`/api/surveys/${data.survey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          survey: { ...prev.survey, status: nextStatus },
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <SurveyAnalysisView
        data={data}
        loading={loading}
        onlyValid={onlyValid}
        setOnlyValid={setOnlyValid}
        statusLoading={statusLoading}
        onToggleStatus={data?.isOwner ? handleToggleStatus : undefined}
        isPublicPage={true}
        backHref={data?.isOwner ? '/dashboard' : '/'}
        backLabel={data?.isOwner ? '대시보드로 돌아가기' : '홈으로 이동'}
      />
    </>
  );
}
