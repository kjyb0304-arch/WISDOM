WISDOM 홈페이지 초기화면 복구 + 토지 개발 행정모니터링 서비스 추가
기준일: 2026-10-07

[확인된 원인]
현재 루트 index.html이 '행정 인허가 선례조사 보고서' 단독 랜딩페이지로 바뀌어 있어
www.wisdom-dj.co.kr 접속 시 정상 메인페이지 대신 해당 서비스 페이지만 표시됩니다.

[이 패치가 하는 일]
1. site/index.html
   - 기존 승인 메인페이지(엑스포교 배경 / WISDOM(慧眼)이 해결의 길을 찾습니다) 복구
   - 메인 실무정보 영역에 '토지 개발 행정모니터링' 카드 추가

2. site/services/administrative-precedent-research/index.html
   - 현재 루트에 잘못 올라가 있는 '행정 인허가 선례조사 보고서' 페이지를 정상 서비스 경로로 보존

3. site/services/land-development-monitoring/index.html
   - 새 '토지 개발 행정모니터링 구독' 홈페이지용 서비스 랜딩페이지

4. blog/WISDOM_토지개발_행정모니터링_구독_네이버블로그.html
   - 네이버 블로그용 강조형 HTML

[GitHub 업로드 방법]
A. 저장소 WISDOM에서 루트 index.html을 이 패키지의 site/index.html로 교체합니다.
B. services 폴더 안의 두 서비스 폴더를 그대로 업로드합니다.
C. Commit changes를 누릅니다.
D. GitHub Pages가 반영된 뒤 www.wisdom-dj.co.kr 을 Ctrl+F5로 새로고침합니다.

[정상 확인 문구]
메인 첫 화면:
"복잡한 인허가와 행정절차,
 WISDOM(慧眼)이
 해결의 길을 찾습니다."

[주의]
이 패치는 루트 메인 복구용입니다.
기존 저장소의 /guide, /specialties, /cases, /insights, /contact 등 다른 폴더는 삭제하지 마십시오.
