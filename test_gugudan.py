
# io 모듈을 import (입출력 관련 기능 제공)
import io
# sys 모듈을 import (시스템 관련 기능 제공)
import sys
# gugudan.py에서 gugudan 함수 import
from gugudan import gugudan

# 구구단 출력 결과를 테스트하는 함수 정의
def test_gugudan_output():
    # 출력 결과를 저장할 StringIO 객체 생성
    captured_output = io.StringIO()
    # 표준 출력을 StringIO 객체로 변경
    sys.stdout = captured_output
    # 사용자로부터 시작단과 끝단을 입력받아 gugudan 함수 실행
    start = input('시작단을 입력하세요: ')
    end = input('끝단을 입력하세요: ')
    gugudan(start, end)
    # 표준 출력을 원래대로 복구
    sys.stdout = sys.__stdout__
    # StringIO에 저장된 출력값을 가져옴
    output = captured_output.getvalue()
    print(output)
    # 구구단 결과가 포함되어 있는지 확인
    if "4 x 2 = 4" in output:
        print("테스트 통과!")
    else:
        print("테스트 오류")

# 이 파일이 직접 실행될 때만 테스트 함수 실행
if __name__ == "__main__":
    test_gugudan_output()
