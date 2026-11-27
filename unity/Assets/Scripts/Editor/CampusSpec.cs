namespace Unjungcheon.EditorTools
{
    // 1번 공간(SKALA 교육장 앞) 치수. 로드뷰 사진 기반 추정치이며 실측이 생기면 여기만 고친다.
    // 좌표: X = 도로 방향(오른쪽 +), Z = 캠퍼스 방향(+), Y = 위. 원점은 도로 중앙선 위.
    public static class CampusSpec
    {
        // 도로 · 보도
        public const float RoadZ = 0f, RoadWidth = 8f;              // 2차선, Z -4..4
        public const float CurbWidth = 0.25f, CurbHeight = 0.15f;
        public const float NearWalkWidth = 5f;                      // 이쪽 보도(붉은 벽돌), Z -9..-4
        public const float FarWalkWidth = 3f;                       // 건너편 보도(화강석), Z 4..7
        public const float GroundHalfX = 140f;                      // 장면 좌우 끝
        public const float CrosswalkX = 18f, CrosswalkWidth = 4f, CrosswalkStripe = 0.5f;
        public const float NearRoadEdgeZ = RoadZ - RoadWidth / 2f;  // -4
        public const float FarRoadEdgeZ = RoadZ + RoadWidth / 2f;   // 4
        public const float NearWalkBackZ = NearRoadEdgeZ - NearWalkWidth; // -9
        public const float PlazaFrontZ = FarRoadEdgeZ + FarWalkWidth;     // 7

        // 본관: 지상 12층, 층고 4m, 폭 45m, 깊이 22m
        public const int MainFloors = 12, MainBandFloors = 4;       // 위 4개 층은 파란 커튼월 띠
        public const float FloorHeight = 4f;
        public const float MainWidth = 45f, MainDepth = 22f;
        public const float MainX = 6f, MainFrontZ = 32f;            // 정면 중심 X, 정면 Z
        public const float MainMetalShare = 0.25f;                  // 정면 왼쪽 1/4 금속 패널
        public const int MainBays = 12;                             // 오른쪽 3/4 세로 창 칸 수
        public const float RoofLouverHeight = 2f;
        public const float EntranceWidth = 12f, EntranceRecess = 2f, CanopyDepth = 3f;
        // SKALA 교육장: 본관 4층. 출입문은 정문 하나다. 밤에는 4층 창이 한 줄로 밝고 균일하게 켜지고, 정문 옆에 층 안내판을 둔다.
        public const int SkalaFloor = 4;
        public const string SkalaSignText = "SKALA 교육장 4F";
        public const float SkalaWindowGlow = 1.4f;                  // 4층 창 발광 세기(일반 창 0.65~0.75보다 밝다)

        // 별관: 지상 8층, 폭 70m, 깊이 25m, 본관 왼쪽 뒤
        public const int AnnexFloors = 8;
        public const float AnnexWidth = 70f, AnnexDepth = 25f;
        public const float AnnexRightX = -26f, AnnexFrontZ = 46f;
        public const float AnnexMullion = 3f;

        // 정문 광장
        public const float PlazaHalfX = 60f;
        public static readonly float[] PineX = { -22f, -16.5f, -11f, -19f, -13.5f };
        public static readonly float[] PineZ = { 11f, 12.5f, 10.5f, 16f, 17f };
        public const float BoxwoodMinX = -25f, BoxwoodMaxX = -7f, BoxwoodMinZ = 8.5f, BoxwoodMaxZ = 19f;
        public const float BoothX = 36f, BoothZ = 12f;

        // 이쪽 보도: 벚나무, 가로등
        public static readonly float[] CherryX = { -34f, -20f, -8f, 14f, 28f, 42f };
        public static readonly float[] LampX = { -27f, -2f, 21f, 46f };
        public const float TreeLineZ = -4.8f;
        public const float LampHeight = 7f;

        // 포장마차(웹 버전 크기): 몸체 3.2 x 1.04 x 1.5, 정면이 캠퍼스(+Z)를 본다
        public const float StallX = 4f, StallZ = -6.9f;
        public const float StallWidth = 3.2f, StallDepth = 1.5f;

        // 사장님
        public const float PlayerStartX = 4f, PlayerStartZ = -8.35f;  // 포장마차 안쪽(사장 자리)
        public const float PlayerRadius = 0.28f, PlayerHeight = 1.75f;
        public const float WalkMinX = -40f, WalkMaxX = 40f;
        public const float WalkMinZ = NearWalkBackZ + PlayerRadius;                // -8.72
        public const float WalkMaxZ = NearRoadEdgeZ - CurbWidth - PlayerRadius;    // -4.53, 도로로 못 나간다

        // 상호작용 지점 (포장마차 기준 상대 위치)
        public const float InteractRadius = 1.1f;
    }
}
