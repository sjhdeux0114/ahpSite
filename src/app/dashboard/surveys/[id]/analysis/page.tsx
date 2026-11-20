'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SurveyAnalysisView from '@/components/analysis/SurveyAnalysisView';
import FormAnalysisView from '@/components/form/FormAnalysisView';

export default function SurveyAnalysisPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onlyValid, setOnlyValid] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchData = async (filterValid: boolean) => {
    try {
      const res = await fetch(`/api/surveys/${id}/responses?onlyValid=${filterValid}`);
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
    if (id) {
      fetchData(onlyValid);
    }
  }, [id, onlyValid]);

  const handleToggleStatus = async () => {
    if (!data?.survey) return;
    const nextStatus = data.survey.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    setStatusLoading(true);

    try {
      const res = await fetch(`/api/surveys/${id}`, {
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
      {data?.survey?.surveyType === 'FORM' && data?.formAnalysis ? (
        <FormAnalysisView
          survey={data.survey}
          formAnalysis={data.formAnalysis}
          responses={data.responses || []}
          isOwner={true}
          backHref="/dashboard"
        />
      ) : (
        <SurveyAnalysisView
          data={data}
          loading={loading}
          onlyValid={onlyValid}
          setOnlyValid={setOnlyValid}
          statusLoading={statusLoading}
          onToggleStatus={handleToggleStatus}
          backHref="/dashboard"
          backLabel="대시보드로 돌아가기"
        />
      )}
    </>
  );
}
