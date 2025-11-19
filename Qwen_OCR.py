import torch
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info

def run_qwen_ocr(image_source):
    import time
    model_id = "Qwen/Qwen2-VL-7B-Instruct"
    print("모델과 프로세서 로드 중...")
    try:
        model = Qwen2VLForConditionalGeneration.from_pretrained(
            model_id,
            torch_dtype="auto",
            device_map="auto"
        )
        processor = AutoProcessor.from_pretrained(model_id)
        print("모델 및 프로세서 로드 완료.")
    except Exception as e:
        import traceback
        print(f"모델 로드 중 오류 발생: {e}")
        traceback.print_exc()
        return

    # 메시지 구성 (이미지와 텍스트 프롬프트)
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "image": image_source,
                    "resized_height": 800,  # 더 큰 값으로 조정
                    "resized_width": 840
                },
                {"type": "text", "text": "이미지에 있는 모든 텍스트를 빠짐없이 인식해줘."},
            ],
        }
    ]

    # 입력 준비
    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)
    inputs = processor(
        text=[text],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt",
    )
    inputs = inputs.to(model.device)

    # 추론 및 시간 측정
    print("텍스트 인식 작업을 시작합니다...")
    start_time = time.time()
    generated_ids = model.generate(**inputs, max_new_tokens=256)
    generated_ids_trimmed = [
        out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    output_text = processor.batch_decode(
        generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
    )
    end_time = time.time()
    elapsed = end_time - start_time
    minutes = int(elapsed // 60)
    seconds = int(elapsed % 60)
    print(f"--- OCR 결과 (소요 시간: {minutes}분 {seconds}초) ---")
    if isinstance(output_text, list):
        for text in output_text:
            for line in text.splitlines():
                print(line)
    else:
        for line in str(output_text).splitlines():
            print(line)

if __name__ == '__main__':
    # 예시: 로컬 파일 또는 URL
    run_qwen_ocr("WalmartReceipt.png")
    # run_qwen_ocr("dl1.jpg")

