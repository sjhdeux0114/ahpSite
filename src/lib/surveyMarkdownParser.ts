export interface ParsedSubCriterion {
  id: string;
  name: string;
  description: string;
}

export interface ParsedCriterion {
  id: string;
  name: string;
  description: string;
  subcriteria: ParsedSubCriterion[];
}

export interface ParsedItem {
  id: string;
  name: string;
  description: string;
}

export interface ParsedDemographic {
  id: string;
  title: string;
  type: 'select' | 'text';
  options: string[];
  required: boolean;
}

export interface ParseSurveyResult {
  success: boolean;
  title: string;
  description: string;
  hasSubcriteria: boolean;
  criteria: ParsedCriterion[];
  hasAlternatives: boolean;
  alternatives: ParsedItem[];
  demographics: ParsedDemographic[];
  stats: {
    criteriaCount: number;
    subcriteriaCount: number;
    alternativesCount: number;
    demographicsCount: number;
  };
  warnings: string[];
  error?: string;
}

type Section = 'NONE' | 'TITLE' | 'DESCRIPTION' | 'CRITERIA' | 'ALTERNATIVES' | 'DEMOGRAPHICS';

/**
 * 줄이 섹션 헤더인지 판단
 */
function detectSectionHeader(rawLine: string): Section | null {
  const trimmed = rawLine.trim();
  if (!trimmed) return null;

  // 앞뒤 마크다운 헤더 기호 제거
  const headerContent = trimmed.replace(/^[#\*\-\s]+/, '').replace(/[#\*\-\s]+$/, '').trim();

  // 1. 설문 기본정보
  if (
    /^(?:1\.?|섹션\s*1\.?|\[1\])?\s*(?:설문\s*기본\s*정보|기본\s*정보|설문\s*제목)(?:\s*\(.*?\))?$/i.test(
      headerContent
    )
  ) {
    return 'TITLE';
  }

  // 2. 설문 목적 및 설명
  if (
    /^(?:2\.?|섹션\s*2\.?|\[2\])?\s*(?:설문\s*목적\s*(?:및|&)?\s*설명|설문\s*설명|설문\s*목적|안내문)(?:\s*\(.*?\))?$/i.test(
      headerContent
    )
  ) {
    return 'DESCRIPTION';
  }

  // 3. 계층형 평가기준
  if (
    /^(?:3\.?|섹션\s*3\.?|\[3\])?\s*(?:계층형\s*평가\s*기준|계층형\s*기준|평가\s*기준|평가기준)(?:\s*\(.*?\))?$/i.test(
      headerContent
    )
  ) {
    return 'CRITERIA';
  }

  // 4. 대안
  if (
    /^(?:4\.?|섹션\s*4\.?|\[4\])?\s*(?:대안|대안\s*목록|평가\s*대안|대안\s*후보|Alternatives)(?:\s*\(.*?\))?$/i.test(
      headerContent
    )
  ) {
    return 'ALTERNATIVES';
  }

  // 5. 응답자 인적사항
  if (
    /^(?:5\.?|섹션\s*5\.?|\[5\])?\s*(?:응답자\s*인적사항|인적사항|응답자\s*정보|프로필\s*문항|Demographics)(?:\s*\(.*?\))?$/i.test(
      headerContent
    )
  ) {
    return 'DEMOGRAPHICS';
  }

  return null;
}

/**
 * 쉼표, 파이프, 대시 등으로 구분된 명칭과 설명을 분리
 * 예: "기능 완성도 , 요구기능 충실한 구현여부" -> ["기능 완성도", "요구기능 충실한 구현여부"]
 */
function splitNameAndDesc(raw: string): { name: string; description: string } {
  const cleaned = raw.trim();
  if (!cleaned) return { name: '', description: '' };

  // 1) 쉼표(,) 구분
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    const name = parts[0].trim();
    const description = parts.slice(1).join(',').trim();
    return { name, description };
  }

  // 2) 파이프(|) 구분
  if (cleaned.includes('|')) {
    const parts = cleaned.split('|');
    const name = parts[0].trim();
    const description = parts.slice(1).join('|').trim();
    return { name, description };
  }

  // 3) ' - ' (하이픈 앞뒤 공백) 구분
  const hyphenMatch = cleaned.match(/^(.+?)\s+-\s+(.+)$/);
  if (hyphenMatch) {
    return { name: hyphenMatch[1].trim(), description: hyphenMatch[2].trim() };
  }

  return { name: cleaned, description: '' };
}

/**
 * 마크다운 텍스트를 파싱하여 AHP 설문 구조로 변환
 */
export function parseSurveyMarkdown(markdown: string): ParseSurveyResult {
  const warnings: string[] = [];

  if (!markdown || !markdown.trim()) {
    return {
      success: false,
      title: '',
      description: '',
      hasSubcriteria: false,
      criteria: [],
      hasAlternatives: false,
      alternatives: [],
      demographics: [],
      stats: { criteriaCount: 0, subcriteriaCount: 0, alternativesCount: 0, demographicsCount: 0 },
      warnings: [],
      error: '입력된 마크다운 내용이 없습니다.',
    };
  }

  // 1. 코드 블록(```markdown ... ```) 제거
  let cleanText = markdown.replace(/^```(?:markdown|md|text)?/im, '').replace(/```$/im, '');

  // 2. 줄 단위 분리
  const lines = cleanText.split(/\r?\n/);

  let title = '';
  let descriptionLines: string[] = [];

  const criteriaMap: Map<number, ParsedCriterion> = new Map();
  const criteriaList: ParsedCriterion[] = [];
  let currentCritIndex = 0;

  const alternatives: ParsedItem[] = [];
  const demographics: ParsedDemographic[] = [];

  let currentSection: Section = 'NONE';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentSection === 'DESCRIPTION' && descriptionLines.length > 0) {
        descriptionLines.push('');
      }
      continue;
    }

    // 섹션 헤더 감지
    const detectedSection = detectSectionHeader(line);
    if (detectedSection) {
      currentSection = detectedSection;
      continue;
    }

    // 섹션별 내용 파싱
    if (currentSection === 'TITLE') {
      const match = trimmed.match(/^(?:내용|제목|설문제목|Title)\s*[:：]\s*(.+)$/i);
      if (match) {
        title = match[1].trim();
      } else if (!title && !trimmed.startsWith('#')) {
        title = trimmed;
      }
    } else if (currentSection === 'DESCRIPTION') {
      const match = trimmed.match(/^(?:내용|설명|목적|Description)\s*[:：]\s*(.+)$/i);
      if (match) {
        descriptionLines.push(match[1].trim());
      } else if (!trimmed.startsWith('#')) {
        descriptionLines.push(trimmed);
      }
    } else if (currentSection === 'CRITERIA') {
      // 1) 세부영역 매칭 먼저 확인 (대분류1sub1, 대분류1-1, sub1, 세부영역1 등)
      const subMatchExplicit = trimmed.match(
        /^(?:[\*\-\s]*)(?:대분류\s*(\d+)\s*(?:sub|세부|하위)[-_]?\s*(\d+)?|대분류\s*(\d+)[-_](\d+))\s*[:：]\s*(.+)$/i
      );

      const subMatchRelative = trimmed.match(
        /^(?:[\*\-\s]*)(?:sub\s*(\d+)|세부영역\s*(\d+)|세부항목\s*(\d+)|세부\s*(\d+)|하위\s*(\d+))\s*[:：]\s*(.+)$/i
      );

      // 들여쓰기된 불릿 (공백 2칸 이상 + '-' 또는 '*')
      const isIndentedBullet = /^(\s{2,}|\t+)[\*\-]\s*(.+)$/.test(line);

      if (subMatchExplicit) {
        const critNum = parseInt(subMatchExplicit[1] || subMatchExplicit[3], 10);
        const content = subMatchExplicit[5];
        const { name, description } = splitNameAndDesc(content);

        let targetCrit = criteriaMap.get(critNum);
        if (!targetCrit) {
          targetCrit = {
            id: `crit_${critNum}_${Date.now()}`,
            name: `대분류 ${critNum}`,
            description: '',
            subcriteria: [],
          };
          criteriaMap.set(critNum, targetCrit);
          criteriaList.push(targetCrit);
          currentCritIndex = critNum;
        }

        const subId = `sub_${critNum}_${targetCrit.subcriteria.length + 1}_${Date.now()}`;
        targetCrit.subcriteria.push({ id: subId, name, description });
        continue;
      }

      if (subMatchRelative) {
        const content = subMatchRelative[6];
        const { name, description } = splitNameAndDesc(content);

        let targetCrit = criteriaList[criteriaList.length - 1];
        if (!targetCrit) {
          targetCrit = {
            id: `crit_1_${Date.now()}`,
            name: '대분류 1',
            description: '',
            subcriteria: [],
          };
          criteriaList.push(targetCrit);
          criteriaMap.set(1, targetCrit);
          currentCritIndex = 1;
        }

        const subId = `sub_${currentCritIndex}_${targetCrit.subcriteria.length + 1}_${Date.now()}`;
        targetCrit.subcriteria.push({ id: subId, name, description });
        continue;
      }

      if (isIndentedBullet && criteriaList.length > 0) {
        const bulletMatch = line.trim().replace(/^[\*\-\s]+/, '');
        const { name, description } = splitNameAndDesc(bulletMatch);
        const targetCrit = criteriaList[criteriaList.length - 1];
        const subId = `sub_${targetCrit.id}_${targetCrit.subcriteria.length + 1}`;
        targetCrit.subcriteria.push({ id: subId, name, description });
        continue;
      }

      // 2) 대분류 매칭
      // 예: "대분류1 : 프로그래밍기초 , 프로그램 개념과 원리를 이해한다"
      // 예: "대분류 2: 디버깅"
      // 예: "- 대분류 1: ..."
      // 예: "### 1. 기술성"
      const critMatch = trimmed.match(
        /^(?:[\*\-\s#]*)(?:대분류\s*(\d+)?|(?:Criterion|Criteria)\s*(\d+)?)\s*[:：]\s*(.+)$/i
      );

      const critHeaderMatch = trimmed.match(/^###?\s*(\d+)\.?\s*(.+)$/);

      if (critMatch) {
        const critNum = critMatch[1] ? parseInt(critMatch[1], 10) : criteriaList.length + 1;
        const content = critMatch[3];
        const { name, description } = splitNameAndDesc(content);

        let targetCrit = criteriaMap.get(critNum);
        if (targetCrit) {
          targetCrit.name = name;
          targetCrit.description = description;
        } else {
          targetCrit = {
            id: `crit_${critNum}_${Date.now()}`,
            name,
            description,
            subcriteria: [],
          };
          criteriaMap.set(critNum, targetCrit);
          criteriaList.push(targetCrit);
        }
        currentCritIndex = critNum;
        continue;
      }

      if (critHeaderMatch) {
        const critNum = parseInt(critHeaderMatch[1], 10);
        const content = critHeaderMatch[2];
        const { name, description } = splitNameAndDesc(content);

        const newCrit: ParsedCriterion = {
          id: `crit_${critNum}_${Date.now()}`,
          name,
          description,
          subcriteria: [],
        };
        criteriaMap.set(critNum, newCrit);
        criteriaList.push(newCrit);
        currentCritIndex = critNum;
        continue;
      }
    } else if (currentSection === 'ALTERNATIVES') {
      // 대안 매칭
      // 예: "대안1 : AWS , 클라우드 서비스"
      // 예: "대안 1: ..."
      // 예: "- 대안 A: ..."
      // 예: "- 솔루션 1: ..."
      const altMatch = trimmed.match(
        /^(?:[\*\-\s#]*)(?:대안\s*([0-9A-Za-z]+)?|Alternative\s*([0-9A-Za-z]+)?)\s*[:：]\s*(.+)$/i
      );

      if (altMatch) {
        const content = altMatch[3];
        const { name, description } = splitNameAndDesc(content);
        alternatives.push({
          id: `alt_${alternatives.length + 1}_${Date.now()}`,
          name,
          description,
        });
        continue;
      }

      // 일반 불릿 목록으로 대안을 나열한 경우
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const content = trimmed.replace(/^[\*\-\s]+/, '');
        const { name, description } = splitNameAndDesc(content);
        if (name) {
          alternatives.push({
            id: `alt_${alternatives.length + 1}_${Date.now()}`,
            name,
            description,
          });
        }
        continue;
      }
    } else if (currentSection === 'DEMOGRAPHICS') {
      // 인적사항 매칭
      // 예: "질문1 : 성별 (객관식) , 남성, 여성, 기타"
      // 예: "질문2 : 소속부서 (주관식)"
      // 예: "문항 1: 연령대 (선택형) - 20대, 30대, 40대"
      const demoMatch = trimmed.match(
        /^(?:[\*\-\s#]*)(?:질문\s*(\d+)?|문항\s*(\d+)?|Q\s*(\d+)?)\s*[:：]\s*(.+)$/i
      );

      const rawContent = demoMatch
        ? demoMatch[4]
        : trimmed.startsWith('-') || trimmed.startsWith('*')
        ? trimmed.replace(/^[\*\-\s]+/, '')
        : null;

      if (rawContent) {
        const isText = /주관식|단답형|text/i.test(rawContent);
        const cleanedContent = rawContent
          .replace(/\((?:객관식|선택형|주관식|단답형|text|select)\)/gi, '')
          .replace(/\[(?:객관식|선택형|주관식|단답형|text|select)\]/gi, '')
          .trim();

        let titlePart = cleanedContent;
        let options: string[] = [];

        if (!isText) {
          // 1) 콜론(:)으로 질문명과 옵션 목록이 분리된 경우 (예: "경력: 없음, 1년, 3년")
          if (cleanedContent.includes(':')) {
            const colonIdx = cleanedContent.indexOf(':');
            titlePart = cleanedContent.substring(0, colonIdx).trim();
            const optionString = cleanedContent.substring(colonIdx + 1).trim();
            options = optionString
              .split(/[,|]/)
              .map(o => o.trim())
              .filter(Boolean);
          } else if (cleanedContent.includes(',')) {
            // 2) 쉼표(,)로 첫 항목이 질문명, 나머지가 옵션인 경우 (예: "성별, 남성, 여성")
            const parts = cleanedContent.split(',');
            titlePart = parts[0].trim();
            options = parts
              .slice(1)
              .map(o => o.trim())
              .filter(Boolean);
          } else if (cleanedContent.includes('|')) {
            // 3) 파이프(|)로 첫 항목이 질문명, 나머지가 옵션인 경우
            const parts = cleanedContent.split('|');
            titlePart = parts[0].trim();
            options = parts
              .slice(1)
              .map(o => o.trim())
              .filter(Boolean);
          }
        }

        demographics.push({
          id: `demo_${demographics.length + 1}_${Date.now()}`,
          title: titlePart,
          type: isText ? 'text' : 'select',
          options: isText ? [] : options.length > 0 ? options : ['선택지 1', '선택지 2'],
          required: true,
        });
      }
    }
  }

  // 3. 후처리 및 검증
  const finalDescription = descriptionLines.join('\n').trim();

  // 대분류 총 개수 및 세부영역 개수 계산
  let totalSubcriteria = 0;
  criteriaList.forEach(c => {
    totalSubcriteria += (c.subcriteria || []).length;
  });

  const hasSubcriteria = totalSubcriteria > 0;
  const hasAlternatives = alternatives.length >= 2;

  // AHP 규칙 검증 및 경고 메시지 생성
  if (criteriaList.length < 2) {
    warnings.push(
      `대분류가 ${criteriaList.length}개 인식되었습니다. AHP 쌍대비교 분석을 위해서는 최소 2개 이상의 대분류가 필요합니다.`
    );
  }

  if (hasSubcriteria) {
    criteriaList.forEach((c, idx) => {
      const subCount = (c.subcriteria || []).length;
      if (subCount === 0) {
        warnings.push(`대분류 '${c.name || `대분류 ${idx + 1}`}'에 하위 세부영역이 등록되지 않았습니다.`);
      } else if (subCount === 1) {
        warnings.push(
          `대분류 '${c.name || `대분류 ${idx + 1}`}'의 세부영역이 1개뿐입니다. AHP 비교를 위해 최소 2개 이상 등록을 권장합니다.`
        );
      }
    });
  }

  if (alternatives.length === 1) {
    warnings.push('대안이 1개만 입력되었습니다. 대안 간 쌍대비교를 위해서는 2개 이상의 대안이 필요합니다.');
  }

  return {
    success: criteriaList.length > 0,
    title: title || 'AHP 계층화 분석 설문',
    description: finalDescription,
    hasSubcriteria,
    criteria: criteriaList,
    hasAlternatives,
    alternatives,
    demographics,
    stats: {
      criteriaCount: criteriaList.length,
      subcriteriaCount: totalSubcriteria,
      alternativesCount: alternatives.length,
      demographicsCount: demographics.length,
    },
    warnings,
  };
}
