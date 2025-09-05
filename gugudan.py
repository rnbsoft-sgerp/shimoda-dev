def gugudan(start_str, end_str):
    # 입력받은 두 개의 문자열을 정수로 변환합니다.
    try:
        start = int(start_str)
        end = int(end_str)
    except ValueError:
        print("시작단과 끝단은 숫자여야 합니다.")
        return
    # 시작단부터 끝단까지 반복합니다.
    for i in range(start, end + 1):
        # 각 단에 대해 1부터 9까지 곱셈 결과를 출력합니다.
        for j in range(1, 10):
            # 곱셈 결과를 형식에 맞게 2자리로 출력합니다.
            print(f"{i} x {j} = {i*j:02}")
        # 각 단이 끝나면 줄바꿈을 출력합니다.
        print()

    # 프로그램의 진입점에서 gugudan 함수를 호출합니다.
if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("사용법: python gugudan.py <시작단> <끝단>")
    else:
        gugudan(sys.argv[1], sys.argv[2])
