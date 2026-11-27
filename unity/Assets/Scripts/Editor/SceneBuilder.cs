using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.UI;
using Unjungcheon.Game;
using S = Unjungcheon.EditorTools.CampusSpec;

namespace Unjungcheon.EditorTools
{
    // 1번 공간(SKALA 교육장 앞) 씬을 코드로만 만든다. 난수를 쓰지 않으므로 다시 만들어도 같다.
    public static class SceneBuilder
    {
        public const string ScenePath = "Assets/Scenes/Location1_Skala.unity";
        const float Walk = S.CurbHeight;  // 보도·광장 윗면 높이

        static readonly Dictionary<string, Material> materials = new Dictionary<string, Material>();

        public static void Build()
        {
            ProjectSetup.Create();
            materials.Clear();
            if (!AssetDatabase.IsValidFolder("Assets/Scenes")) AssetDatabase.CreateFolder("Assets", "Scenes");
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            Light moon = Night();
            Transform env = Group("Street");
            Ground(env);
            StreetFurniture(env);
            Transform campus = Group("Campus");
            MainTower(campus);
            Annex(campus);
            Neighbor(campus);
            Plaza(campus);
            InteractionPoint[] points = Stall(Group("Stall"));

            var runner = new GameObject("Game Runner").AddComponent<GameRunner>();
            PlayerController player = Owner(points, runner, out Renderer[] body, out InteractionFinder finder);
            BuildCamera(player, body);
            Hud(runner, finder);
            var volume = new GameObject("Night Volume").AddComponent<Volume>();
            volume.isGlobal = true;
            volume.sharedProfile = ProjectSetup.NightProfile();
            RenderSettings.sun = moon;

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log("Scene built: " + ScenePath);
        }

        // ---------- 재질 ----------

        static Material Mat(string name, Color color, float metallic = 0f, float smoothness = 0.25f, float emission = 0f)
        {
            if (materials.TryGetValue(name, out Material found)) return found;
            string path = ProjectSetup.AssetDir + "/" + name + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
                AssetDatabase.CreateAsset(material, path);
            }
            material.SetColor("_BaseColor", color);
            material.SetFloat("_Metallic", metallic);
            material.SetFloat("_Smoothness", smoothness);
            if (emission > 0f)
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", color * emission);
                // URP는 가져올 때 이 플래그로 _EMISSION 키워드를 다시 정한다. Emissive 플래그가 없으면 발광이 꺼진다.
                material.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
            }
            else
            {
                material.DisableKeyword("_EMISSION");
                material.globalIlluminationFlags = MaterialGlobalIlluminationFlags.EmissiveIsBlack;
                material.SetColor("_EmissionColor", Color.black);
            }
            EditorUtility.SetDirty(material);
            materials.Add(name, material);
            return material;
        }

        static Material Granite => Mat("Granite", new Color(.52f, .51f, .49f), 0f, .18f);
        static Material PlazaStone => Mat("PlazaGranite", new Color(.58f, .57f, .55f), 0f, .22f);
        static Material Brick => Mat("RedBrick", new Color(.46f, .2f, .15f), 0f, .12f);
        static Material Asphalt => Mat("Asphalt", new Color(.07f, .075f, .08f), 0f, .15f);
        static Material SilverPanel => Mat("SilverMetalPanel", new Color(.66f, .69f, .71f), .85f, .55f);
        static Material PalePanel => Mat("PaleFacade", new Color(.74f, .76f, .77f), .3f, .45f);
        static Material Pilaster => Mat("Pilaster", new Color(.84f, .86f, .86f), .25f, .5f);
        static Material BlueGlass => Mat("BlueGlass", new Color(.1f, .27f, .55f), .7f, .92f);
        static Material DeepGlass => Mat("DeepGlass", new Color(.05f, .12f, .24f), .75f, .94f);
        static Material AnnexGlass => Mat("AnnexGlass", new Color(.22f, .3f, .38f), .65f, .9f);
        static Material DarkMetal => Mat("DarkLouver", new Color(.08f, .09f, .1f), .6f, .4f);
        static Material Canopy => Mat("CanopyGray", new Color(.2f, .21f, .22f), .5f, .4f);
        static Material WarmWindow => Mat("WindowWarm", new Color(1f, .78f, .5f), 0f, .6f, .75f);
        static Material CoolWindow => Mat("WindowCool", new Color(.72f, .84f, 1f), 0f, .6f, .65f);
        static Material SkalaWindow => Mat("WindowSkalaClass", new Color(.9f, .95f, 1f), 0f, .6f, S.SkalaWindowGlow);
        static Material Lobby => Mat("LobbyGlow", new Color(1f, .86f, .66f), 0f, .7f, .8f);
        static Material SkRed => Mat("SkRed", new Color(.86f, .05f, .08f), 0f, .4f, 2.2f);
        static Material SkOrange => Mat("SkOrange", new Color(1f, .45f, .05f), 0f, .4f, 2.2f);
        static Material White => Mat("PaintWhite", new Color(.92f, .92f, .9f), 0f, .3f);
        static Material Yellow => Mat("PaintYellow", new Color(.95f, .72f, .1f), 0f, .3f);
        static Material Boxwood => Mat("Boxwood", new Color(.1f, .22f, .08f), 0f, .2f);
        static Material PineLeaf => Mat("PineNeedles", new Color(.07f, .17f, .1f), 0f, .15f);
        static Material CherryLeaf => Mat("CherryLeaves", new Color(.2f, .33f, .16f), 0f, .15f);
        static Material Bark => Mat("Bark", new Color(.24f, .17f, .12f), 0f, .1f);
        static Material Soil => Mat("GrassSoil", new Color(.09f, .12f, .07f), 0f, .1f);
        static Material Pole => Mat("PoleGray", new Color(.3f, .31f, .32f), .7f, .5f);
        static Material LampHead => Mat("LampHead", new Color(1f, .86f, .62f), 0f, .5f, 4f);

        // ---------- 기본 도형 ----------

        static Transform Group(string name, Transform parent = null)
        {
            var go = new GameObject(name);
            if (parent != null) go.transform.SetParent(parent, false);
            return go.transform;
        }

        // min/max 모서리로 상자를 만든다.
        static GameObject Block(string name, Transform parent, Vector3 min, Vector3 max, Material mat, bool solid = false)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = (min + max) * .5f;
            go.transform.localScale = max - min;
            go.GetComponent<Renderer>().sharedMaterial = mat;
            if (!solid) Object.DestroyImmediate(go.GetComponent<Collider>());
            return go;
        }

        static GameObject Box(string name, Transform parent, Vector3 center, Vector3 size, Material mat, bool solid = false, Vector3 euler = default)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = center;
            go.transform.localRotation = Quaternion.Euler(euler);
            go.transform.localScale = size;
            go.GetComponent<Renderer>().sharedMaterial = mat;
            if (!solid) Object.DestroyImmediate(go.GetComponent<Collider>());
            return go;
        }

        static GameObject Shape(PrimitiveType type, string name, Transform parent, Vector3 center, Vector3 size, Material mat, bool solid = false, Vector3 euler = default)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = center;
            go.transform.localRotation = Quaternion.Euler(euler);
            go.transform.localScale = size;
            go.GetComponent<Renderer>().sharedMaterial = mat;
            if (!solid) Object.DestroyImmediate(go.GetComponent<Collider>());
            return go;
        }

        static void PointLight(string name, Transform parent, Vector3 position, Color color, float intensity, float range)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = position;
            var light = go.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = color;
            light.intensity = intensity;
            light.range = range;
            light.shadows = LightShadows.None;
        }

        // 글자 간판. 텍스처 이미지 없이 내장 글꼴 메시로 만든다. 정면(-Z 쪽)에서 읽힌다.
        static void Sign(string text, Transform parent, Vector3 position, float height, Color color, string name = null)
        {
            var go = new GameObject(name ?? text + " sign");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = position;
            var mesh = go.AddComponent<TextMesh>();
            Font font = GameFont();
            mesh.font = font;
            mesh.text = text;
            mesh.fontSize = 96;
            mesh.characterSize = height / 96f * 10f;
            mesh.fontStyle = FontStyle.Bold;
            mesh.anchor = TextAnchor.MiddleCenter;
            mesh.alignment = TextAlignment.Center;
            mesh.color = color;
            go.GetComponent<MeshRenderer>().sharedMaterial = SignTextMaterial(font);
        }

        // 내장 글꼴 재질은 깊이 검사를 하지 않아(ZTest Always) 간판 글자가 물체를 뚫고 보인다. 깊이 검사를 하는 Assets/Shaders/SignText.shader를 쓴다.
        static Material SignTextMaterial(Font font)
        {
            if (materials.TryGetValue("SignText", out Material found)) return found;
            string path = ProjectSetup.AssetDir + "/SignText.mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(Shader.Find("Unjungcheon/SignText"));
                AssetDatabase.CreateAsset(material, path);
            }
            material.mainTexture = font.material.mainTexture;
            EditorUtility.SetDirty(material);
            materials.Add("SignText", material);
            return material;
        }

        // 간판·HUD 글꼴: Pretendard Bold(SIL OFL 1.1, Assets/Fonts/OFL.txt).
        // 내장 글꼴은 데스크톱에서만 OS 글꼴로 한글을 대체하고 WebGL에서는 한글이 빠지므로, 한글 글리프가 있는 글꼴을 함께 빌드한다.
        public const string FontPath = "Assets/Fonts/Pretendard-Bold.otf";
        static Font GameFont()
        {
            var font = AssetDatabase.LoadAssetAtPath<Font>(FontPath);
            if (font == null) throw new System.IO.FileNotFoundException("글꼴 없음: " + FontPath);
            return font;
        }

        // SK 로고: 빨간 글자와 오른쪽 위 날개(빨강·주황 두 장).
        static void SkLogo(Transform parent, Vector3 position, float height)
        {
            Transform logo = Group("SK logo", parent);
            logo.localPosition = position;
            Sign("SK", logo, new Vector3(0f, 0f, 0f), height, new Color(1f, .1f, .12f));
            float w = height * .55f;
            Box("Wing red", logo, new Vector3(height * .75f, height * .62f, .02f), new Vector3(w, w * .38f, .06f), SkRed, false, new Vector3(0f, 0f, 28f));
            Box("Wing orange", logo, new Vector3(height * 1.02f, height * .42f, .02f), new Vector3(w * .8f, w * .3f, .06f), SkOrange, false, new Vector3(0f, 0f, -22f));
        }

        // 결정적 해시: 창 불빛 배치. 층마다 켜진 비율이 다르다.
        static bool Lit(int floor, int bay, int salt)
        {
            uint h = (uint)(floor * 73856093) ^ (uint)(bay * 19349663) ^ (uint)(salt * 83492791);
            h ^= h >> 13; h *= 0x5bd1e995; h ^= h >> 15;
            float density = .08f + ((floor * 37 + salt * 11) % 9) * .045f;
            return (h % 1000) / 1000f < density;
        }

        // ---------- 밤 ----------

        static Light Night()
        {
            var moon = new GameObject("Moonlight").AddComponent<Light>();
            moon.type = LightType.Directional;
            moon.color = new Color(.55f, .66f, 1f);
            moon.intensity = .35f;
            moon.shadows = LightShadows.Soft;
            moon.shadowStrength = .6f;
            moon.transform.rotation = Quaternion.Euler(38f, -32f, 0f);

            string skyPath = ProjectSetup.AssetDir + "/NightSky.mat";
            var skybox = AssetDatabase.LoadAssetAtPath<Material>(skyPath);
            if (skybox == null)
            {
                skybox = new Material(Shader.Find("Skybox/Procedural"));
                AssetDatabase.CreateAsset(skybox, skyPath);
            }
            skybox.SetFloat("_SunDisk", 0f);
            skybox.EnableKeyword("_SUNDISK_NONE");
            skybox.SetFloat("_SunSize", 0f);
            skybox.SetFloat("_AtmosphereThickness", .55f);
            skybox.SetColor("_SkyTint", new Color(.25f, .32f, .55f));
            skybox.SetColor("_GroundColor", new Color(.04f, .045f, .05f));
            skybox.SetFloat("_Exposure", .12f);
            EditorUtility.SetDirty(skybox);
            RenderSettings.skybox = skybox;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(.11f, .13f, .22f);
            RenderSettings.ambientEquatorColor = new Color(.07f, .07f, .09f);
            RenderSettings.ambientGroundColor = new Color(.03f, .03f, .03f);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogColor = new Color(.05f, .06f, .1f);
            RenderSettings.fogStartDistance = 90f;
            RenderSettings.fogEndDistance = 320f;
            DynamicGI.UpdateEnvironment();
            return moon;
        }

        // ---------- 도로 · 보도 ----------

        static void Ground(Transform root)
        {
            float hx = S.GroundHalfX;
            Block("Ground", root, new Vector3(-hx, -.6f, -40f), new Vector3(hx, -.02f, 140f), Soil, true);
            Block("Road", root, new Vector3(-hx, -.3f, S.NearRoadEdgeZ), new Vector3(hx, 0f, S.FarRoadEdgeZ), Asphalt, true);
            // 중앙선: 노란 실선 두 줄, 횡단보도에서 끊긴다.
            float cwMin = S.CrosswalkX - S.CrosswalkWidth / 2f - 1f, cwMax = S.CrosswalkX + S.CrosswalkWidth / 2f + 1f;
            foreach (float dz in new[] { -.12f, .12f })
            {
                Block("Center line", root, new Vector3(-hx, 0f, S.RoadZ + dz - .06f), new Vector3(cwMin, .012f, S.RoadZ + dz + .06f), Yellow);
                Block("Center line", root, new Vector3(cwMax, 0f, S.RoadZ + dz - .06f), new Vector3(hx, .012f, S.RoadZ + dz + .06f), Yellow);
            }
            foreach (float z in new[] { S.NearRoadEdgeZ + .35f, S.FarRoadEdgeZ - .35f })
                Block("Edge line", root, new Vector3(-hx, 0f, z - .06f), new Vector3(hx, .012f, z + .06f), White);
            // 횡단보도: 줄무늬는 차 진행 방향(X)으로 길고, 도로 폭(Z) 방향으로 늘어선다.
            for (float z = S.NearRoadEdgeZ + .75f; z <= S.FarRoadEdgeZ - .5f; z += S.CrosswalkStripe * 2f)
                Block("Crosswalk stripe", root, new Vector3(S.CrosswalkX - S.CrosswalkWidth / 2f, 0f, z - S.CrosswalkStripe / 2f),
                    new Vector3(S.CrosswalkX + S.CrosswalkWidth / 2f, .014f, z + S.CrosswalkStripe / 2f), White);

            // 이쪽 보도: 붉은 벽돌, 도로 쪽 경계석(콜라이더), 뒤쪽 화단 울타리(콜라이더)
            Block("Near brick sidewalk", root, new Vector3(-hx, -.3f, S.NearWalkBackZ), new Vector3(hx, Walk, S.NearRoadEdgeZ - S.CurbWidth), Brick, true);
            Block("Near curb", root, new Vector3(-hx, -.3f, S.NearRoadEdgeZ - S.CurbWidth), new Vector3(hx, Walk + .03f, S.NearRoadEdgeZ), Granite, true);
            Block("Near hedge", root, new Vector3(-hx, Walk, S.NearWalkBackZ - .9f), new Vector3(hx, .95f, S.NearWalkBackZ), Boxwood, true);
            // 도로 쪽 보이지 않는 경계: 경계석을 넘어 도로로 나가지 못한다.
            Block("Road guard (invisible)", root, new Vector3(-hx, Walk, S.NearRoadEdgeZ - S.CurbWidth), new Vector3(hx, 2.5f, S.NearRoadEdgeZ), Granite, true)
                .GetComponent<Renderer>().enabled = false;
            // 건너편 보도
            Block("Far sidewalk", root, new Vector3(-hx, -.3f, S.FarRoadEdgeZ + S.CurbWidth), new Vector3(hx, Walk, S.PlazaFrontZ), Granite, true);
            Block("Far curb", root, new Vector3(-hx, -.3f, S.FarRoadEdgeZ), new Vector3(hx, Walk + .03f, S.FarRoadEdgeZ + S.CurbWidth), Granite, true);
        }

        static void StreetFurniture(Transform root)
        {
            foreach (float x in S.CherryX) CherryTree(root, x, S.TreeLineZ);
            for (int i = 0; i < S.LampX.Length; i++)
            {
                StreetLamp(root, S.LampX[i], S.NearRoadEdgeZ - .55f, 1f);
                StreetLamp(root, S.LampX[i] + 12f, S.FarRoadEdgeZ + .55f, -1f);
            }
        }

        static void StreetLamp(Transform root, float x, float z, float toward)
        {
            Transform lamp = Group("Streetlight", root);
            lamp.localPosition = new Vector3(x, Walk, z);
            Shape(PrimitiveType.Cylinder, "Pole", lamp, new Vector3(0f, S.LampHeight / 2f, 0f), new Vector3(.16f, S.LampHeight / 2f, .16f), Pole, true);
            Box("Arm", lamp, new Vector3(0f, S.LampHeight - .1f, toward * .7f), new Vector3(.1f, .1f, 1.4f), Pole);
            Box("Head", lamp, new Vector3(0f, S.LampHeight - .25f, toward * 1.3f), new Vector3(.35f, .12f, .6f), LampHead);
            PointLight("Lamp light", lamp, new Vector3(0f, S.LampHeight - .5f, toward * 1.3f), new Color(1f, .82f, .58f), 30f, 20f);
        }

        static void CherryTree(Transform root, float x, float z)
        {
            Transform tree = Group("Cherry tree", root);
            tree.localPosition = new Vector3(x, Walk, z);
            Block("Tree pit", tree, new Vector3(-.6f, -.02f, -.6f), new Vector3(.6f, .02f, .6f), Soil);
            Shape(PrimitiveType.Cylinder, "Trunk", tree, new Vector3(0f, 1.5f, 0f), new Vector3(.24f, 1.5f, .24f), Bark, true);
            Vector3[] crowns = { new Vector3(0f, 3.7f, 0f), new Vector3(.9f, 3.4f, .3f), new Vector3(-.8f, 3.5f, -.2f), new Vector3(.1f, 4.4f, -.3f) };
            foreach (Vector3 c in crowns) Shape(PrimitiveType.Sphere, "Crown", tree, c, new Vector3(2.6f, 2f, 2.4f), CherryLeaf);
        }

        static void PineTree(Transform root, float x, float z, float baseY, int index)
        {
            Transform tree = Group("Pine tree", root);
            tree.localPosition = new Vector3(x, baseY, z);
            float lean = (index % 2 == 0 ? 1f : -1f) * (6f + index * 2f);
            float height = 7.5f + (index % 3) * 1.2f;
            Shape(PrimitiveType.Cylinder, "Trunk", tree, new Vector3(0f, height / 2f, 0f), new Vector3(.38f, height / 2f, .38f), Bark, true, new Vector3(0f, 0f, lean));
            float topX = -Mathf.Sin(lean * Mathf.Deg2Rad) * height;
            // 소나무: 위쪽에 넓고 납작한 잎 덩어리 층
            for (int i = 0; i < 4; i++)
            {
                float t = .55f + i * .15f;
                float side = (i % 2 == 0 ? 1f : -1f) * (1.2f - i * .25f);
                Shape(PrimitiveType.Sphere, "Needles", tree, new Vector3(topX * t + side, height * t + .6f, (i - 1.5f) * .4f),
                    new Vector3(4.6f - i * .7f, 1.1f, 3.4f - i * .4f), PineLeaf);
            }
        }

        // ---------- 캠퍼스 ----------

        static void MainTower(Transform campus)
        {
            Transform main = Group("Main tower (본관)", campus);
            float left = S.MainX - S.MainWidth / 2f, right = S.MainX + S.MainWidth / 2f;
            float front = S.MainFrontZ, back = front + S.MainDepth;
            float lowTop = (S.MainFloors - S.MainBandFloors) * S.FloorHeight;   // 32m
            float bandTop = S.MainFloors * S.FloorHeight;                         // 48m
            float metalRight = left + S.MainWidth * S.MainMetalShare;
            float g = Walk;

            // 몸체: 1층은 안으로 들어간다.
            Block("Core floors 2-8", main, new Vector3(left, g + S.FloorHeight, front + .5f), new Vector3(right, g + lowTop, back), PalePanel, true);
            Block("Core ground floor", main, new Vector3(left, g, front + S.EntranceRecess + .2f), new Vector3(right, g + S.FloorHeight, back), PalePanel, true);
            // 정면 왼쪽 1/4: 창 없는 은회색 금속 패널(1층까지 내려온다)
            Block("Metal panel quarter", main, new Vector3(left - .05f, g, front), new Vector3(metalRight, g + lowTop, front + .6f), SilverPanel, true);
            for (float y = g + 2f; y < g + lowTop; y += 2f)
                Block("Panel seam", main, new Vector3(left - .06f, y - .02f, front - .01f), new Vector3(metalRight, y + .02f, front), DarkMetal);
            SkLogo(main, new Vector3((left + metalRight) / 2f - 1.2f, g + lowTop - 3.2f, front - .08f), 3.4f);

            // 오른쪽 3/4, 2~8층: 세로 창 격자와 밝은 회색 필라스터
            float bay = (right - metalRight) / S.MainBays;
            for (int b = 0; b <= S.MainBays; b++)
                Block("Pilaster", main, new Vector3(metalRight + b * bay - .32f, g + S.FloorHeight, front - .45f),
                    new Vector3(metalRight + b * bay + .32f, g + lowTop, front + .5f), Pilaster);
            for (int floor = 2; floor <= S.MainFloors - S.MainBandFloors; floor++)
            {
                float y0 = g + (floor - 1) * S.FloorHeight;
                Block("Spandrel", main, new Vector3(metalRight, y0 - .25f, front + .05f), new Vector3(right, y0 + .25f, front + .5f), PalePanel);
                for (int b = 0; b < S.MainBays; b++)
                {
                    float cx = metalRight + (b + .5f) * bay;
                    Material m = floor == S.SkalaFloor ? SkalaWindow : Lit(floor, b, 1) ? WarmWindow : BlueGlass;
                    Block("Window", main, new Vector3(cx - bay * .3f, y0 + .3f, front + .2f), new Vector3(cx + bay * .3f, y0 + S.FloorHeight - .3f, front + .5f), m);
                }
            }

            // 1층: 들어간 유리 출입구, 짙은 회색 캐노피와 로고
            float entranceLeft = metalRight + 1f, entranceRight = entranceLeft + S.EntranceWidth;
            float glassZ = front + S.EntranceRecess;
            Block("Lobby glass", main, new Vector3(metalRight, g, glassZ), new Vector3(right, g + S.FloorHeight - .2f, glassZ + .2f), DeepGlass);
            Block("Entrance doors (lit)", main, new Vector3(entranceLeft + 2f, g, glassZ - .05f), new Vector3(entranceRight - 2f, g + 3f, glassZ), Lobby);
            for (int b = 0; b <= S.MainBays; b += 2)
                Block("Ground column", main, new Vector3(metalRight + b * bay - .35f, g, front + .2f), new Vector3(metalRight + b * bay + .35f, g + S.FloorHeight, front + .9f), Canopy, true);
            Block("Entrance canopy", main, new Vector3(entranceLeft - 1f, g + S.FloorHeight - .1f, front - S.CanopyDepth),
                new Vector3(entranceRight + 1f, g + S.FloorHeight + .7f, front + .5f), Canopy);
            SkLogo(main, new Vector3((entranceLeft + entranceRight) / 2f - .4f, g + S.FloorHeight + .3f, front - S.CanopyDepth - .06f), .6f);

            // SKALA 교육장은 4층이다. 출입문은 정문 하나이고, 정문 오른쪽에 작은 층 안내판을 세운다.
            Transform floorSign = Group("SKALA floor sign", main);
            floorSign.localPosition = new Vector3(entranceRight + 2.4f, g, front - 2.6f); // 오른쪽 회양목 화단 앞
            Block("Sign post", floorSign, new Vector3(-.06f, 0f, -.06f), new Vector3(.06f, 1.2f, .06f), Pole, true);
            Block("Sign board", floorSign, new Vector3(-1.25f, 1.2f, -.05f), new Vector3(1.25f, 1.75f, .05f), Mat("SignNavy", new Color(.06f, .1f, .2f), .3f, .5f, .4f));
            Sign(S.SkalaSignText, floorSign, new Vector3(0f, 1.475f, -.07f), .3f, Color.white, "SKALA floor sign text");
            PointLight("SKALA sign light", floorSign, new Vector3(0f, 2.2f, -.6f), new Color(.8f, .9f, 1f), 2f, 4f);
            PointLight("Main entrance light", main, new Vector3((entranceLeft + entranceRight) / 2f, g + 3.5f, front - 2f), new Color(1f, .85f, .65f), 10f, 12f);

            // 위 4개 층: 수평으로 이어진 파란 커튼월 띠(옆면까지 감싼다)
            Block("Curtain wall band", main, new Vector3(left - .1f, g + lowTop, front - .1f), new Vector3(right + .1f, g + bandTop, back + .1f), BlueGlass, true);
            for (int floor = S.MainFloors - S.MainBandFloors + 1; floor <= S.MainFloors; floor++)
            {
                float y0 = g + (floor - 1) * S.FloorHeight;
                Block("Band floor line", main, new Vector3(left - .15f, y0 - .12f, front - .16f), new Vector3(right + .15f, y0 + .12f, front), Pilaster);
                int segments = Mathf.RoundToInt(S.MainWidth / 3f);
                float seg = S.MainWidth / segments;
                for (int i = 0; i < segments; i++)
                {
                    float x0 = left + i * seg;
                    Block("Band mullion", main, new Vector3(x0 - .05f, y0, front - .16f), new Vector3(x0 + .05f, y0 + S.FloorHeight, front), DarkMetal);
                    if (Lit(floor, i, 2))
                        Block("Band window (lit)", main, new Vector3(x0 + .15f, y0 + .4f, front - .13f), new Vector3(x0 + seg - .15f, y0 + S.FloorHeight - .5f, front - .1f), CoolWindow);
                }
            }
            // 옥상: 어두운 루버 띠
            Block("Roof louver band", main, new Vector3(left, g + bandTop, front), new Vector3(right, g + bandTop + S.RoofLouverHeight, back), DarkMetal, true);
            for (int i = 1; i <= 4; i++)
                Block("Louver slat", main, new Vector3(left, g + bandTop + i * .4f - .04f, front - .12f), new Vector3(right, g + bandTop + i * .4f + .04f, front), Pole);

            // 오른쪽 옆면에도 세로 창 몇 줄
            for (int floor = 2; floor <= S.MainFloors - S.MainBandFloors; floor++)
                for (int b = 0; b < 6; b++)
                {
                    float z0 = front + 2f + b * 3.3f, y0 = g + (floor - 1) * S.FloorHeight;
                    Block("Side window", main, new Vector3(right, y0 + .3f, z0), new Vector3(right + .05f, y0 + S.FloorHeight - .3f, z0 + 1.4f), floor == S.SkalaFloor ? SkalaWindow : Lit(floor, b, 3) ? WarmWindow : BlueGlass);
                }
        }

        static void Annex(Transform campus)
        {
            Transform annex = Group("Annex (별관)", campus);
            float right = S.AnnexRightX, left = right - S.AnnexWidth;
            float front = S.AnnexFrontZ, back = front + S.AnnexDepth;
            float top = S.AnnexFloors * S.FloorHeight, g = Walk;
            Block("Annex body", annex, new Vector3(left, g, front), new Vector3(right, g + top, back), AnnexGlass, true);
            int cols = Mathf.RoundToInt(S.AnnexWidth / S.AnnexMullion);
            for (int c = 0; c <= cols; c++)
            {
                float x = left + c * S.AnnexMullion;
                Block("Annex mullion", annex, new Vector3(x - .08f, g, front - .25f), new Vector3(x + .08f, g + top, front), Pilaster);
            }
            for (int floor = 1; floor <= S.AnnexFloors; floor++)
            {
                float y0 = g + (floor - 1) * S.FloorHeight;
                Block("Annex floor line", annex, new Vector3(left, y0 - .1f, front - .2f), new Vector3(right, y0 + .1f, front), DarkMetal);
                for (int c = 0; c < cols; c++)
                    if (Lit(floor, c, 4))
                        Block("Annex window (lit)", annex, new Vector3(left + c * S.AnnexMullion + .2f, y0 + .4f, front - .06f),
                            new Vector3(left + (c + 1) * S.AnnexMullion - .2f, y0 + S.FloorHeight - .5f, front - .02f), floor % 3 == 0 ? WarmWindow : CoolWindow);
            }
            // 옥상 난간
            Block("Annex roof rail", annex, new Vector3(left, g + top + 1f, front - .05f), new Vector3(right, g + top + 1.1f, front + .05f), Pole);
            for (int c = 0; c <= cols; c++)
            {
                float x = left + c * S.AnnexMullion;
                Block("Rail post", annex, new Vector3(x - .04f, g + top, front - .04f), new Vector3(x + .04f, g + top + 1.1f, front + .04f), Pole);
            }
            SkLogo(annex, new Vector3(right - 7f, g + top - 3f, front - .3f), 2.6f);
        }

        // 캠퍼스 오른쪽의 이름 없는 이웃 오피스(배경)
        static void Neighbor(Transform campus)
        {
            Transform n = Group("Neighbor office", campus);
            float left = 50f, right = 80f, front = 40f, top = 36f, g = Walk;
            Block("Neighbor body", n, new Vector3(left, g, front), new Vector3(right, g + top, front + 26f), DeepGlass, true);
            for (int floor = 1; floor <= 9; floor++)
                for (int c = 0; c < 10; c++)
                    if (Lit(floor, c, 5))
                        Block("Neighbor window (lit)", n, new Vector3(left + c * 3f + .3f, g + (floor - 1) * 4f + .5f, front - .05f),
                            new Vector3(left + (c + 1) * 3f - .3f, g + floor * 4f - .6f, front), CoolWindow);
        }

        static void Plaza(Transform campus)
        {
            Transform plaza = Group("Front plaza (정문 광장)", campus);
            Block("Granite plaza", plaza, new Vector3(-S.PlazaHalfX, -.3f, S.PlazaFrontZ), new Vector3(S.PlazaHalfX, Walk, S.MainFrontZ + 4f), PlazaStone, true);
            for (float x = -S.PlazaHalfX; x <= S.PlazaHalfX; x += 6f)
                Block("Paving joint", plaza, new Vector3(x - .03f, Walk, S.PlazaFrontZ), new Vector3(x + .03f, Walk + .005f, S.MainFrontZ), Granite);
            // 낮은 회양목 화단과 소나무
            Block("Planter edge", plaza, new Vector3(S.BoxwoodMinX, Walk, S.BoxwoodMinZ), new Vector3(S.BoxwoodMaxX, Walk + .45f, S.BoxwoodMaxZ), Canopy, true);
            Block("Boxwood bed", plaza, new Vector3(S.BoxwoodMinX + .3f, Walk + .45f, S.BoxwoodMinZ + .3f), new Vector3(S.BoxwoodMaxX - .3f, Walk + .9f, S.BoxwoodMaxZ - .3f), Boxwood);
            for (int i = 0; i < S.PineX.Length; i++) PineTree(plaza, S.PineX[i], S.PineZ[i], Walk + .9f, i);
            Block("Hedge right of entrance", plaza, new Vector3(9f, Walk, S.MainFrontZ - 2f), new Vector3(20f, Walk + .9f, S.MainFrontZ - .6f), Boxwood, true);
            // 오른쪽 주차 차단기 부스
            Transform booth = Group("Parking booth", plaza);
            booth.localPosition = new Vector3(S.BoothX, Walk, S.BoothZ);
            Block("Booth body", booth, new Vector3(-1.2f, 0f, -1.2f), new Vector3(1.2f, 2.6f, 1.2f), White, true);
            Block("Booth window (lit)", booth, new Vector3(-1f, 1.1f, -1.22f), new Vector3(1f, 2.2f, -1.2f), Lobby);
            Block("Booth roof", booth, new Vector3(-1.5f, 2.6f, -1.5f), new Vector3(1.5f, 2.85f, 1.5f), Canopy);
            Block("Barrier post", booth, new Vector3(-1.7f, 0f, -.2f), new Vector3(-1.4f, 1f, .2f), Yellow, true);
            for (int i = 0; i < 6; i++)
                Block("Barrier arm", booth, new Vector3(-1.7f - (i + 1) * .7f, .9f, -.05f), new Vector3(-1.7f - i * .7f, 1f, .05f), i % 2 == 0 ? SkRed : White);
            PointLight("Booth light", booth, new Vector3(0f, 3.2f, -1.6f), new Color(1f, .9f, .7f), 4f, 7f);
        }

        // ---------- 포장마차 (웹 버전 구성, 정면이 +Z) ----------

        static InteractionPoint[] Stall(Transform root)
        {
            root.localPosition = new Vector3(S.StallX, Walk, S.StallZ);
            var wood = Mat("StallWood", new Color(.38f, .24f, .14f), 0f, .3f);
            var top = Mat("StallCounterTop", new Color(.5f, .5f, .48f), .5f, .35f);
            var canvas = Mat("AwningRed", new Color(.74f, .2f, .12f), 0f, .2f);
            var iron = Mat("StallIron", new Color(.12f, .12f, .13f), .7f, .45f);
            var bulb = Mat("StallBulb", new Color(1f, .78f, .45f), 0f, .5f, 5f);
            var stool = Mat("StoolRed", new Color(.7f, .1f, .08f), 0f, .4f);

            Box("Stall body", root, new Vector3(0f, .52f, 0f), new Vector3(S.StallWidth, 1.04f, S.StallDepth), wood, true);
            Box("Stall counter", root, new Vector3(0f, 1.08f, .1f), new Vector3(3.5f, .08f, 1.9f), top);
            foreach (float dx in new[] { -1.6f, 1.6f }) foreach (float dz in new[] { .85f, -.75f })
                    Shape(PrimitiveType.Cylinder, "Stall post", root, new Vector3(dx, 1.7f, dz), new Vector3(.08f, .6f, .08f), iron);
            Box("Stall awning", root, new Vector3(0f, 2.3f, .05f), new Vector3(3.9f, .12f, 2.3f), canvas);
            Box("Awning valance", root, new Vector3(0f, 2.06f, 1.18f), new Vector3(3.9f, .4f, .06f), canvas);
            Box("Sign board", root, new Vector3(0f, 2.75f, 1.0f), new Vector3(2.2f, .5f, .08f), Mat("StallSign", new Color(.95f, .86f, .62f), 0f, .4f, .6f));
            Sign("붕어빵", root, new Vector3(0f, 2.75f, .95f), .32f, new Color(.45f, .12f, .05f), "Stall sign text");
            for (int i = 0; i < 8; i++)
                Shape(PrimitiveType.Sphere, "Bulb", root, new Vector3(-1.75f + i * .5f, 2.14f, 1.2f), Vector3.one * .09f, bulb);
            PointLight("Stall warm light", root, new Vector3(0f, 2.1f, .6f), new Color(1f, .62f, .32f), 2.5f, 9f);

            // 붕어빵 틀 8칸(사장 쪽 왼편), 떡볶이 판·어묵 솥 자리(오른편), 타코야끼 판 자리(앞쪽)
            for (int i = 0; i < 8; i++)
                Shape(PrimitiveType.Cylinder, "Fish mold", root, new Vector3(-1.35f + (i % 4) * .5f, 1.16f, -.45f + (i / 4) * .45f), new Vector3(.4f, .03f, .3f), iron);
            Shape(PrimitiveType.Cylinder, "Tteokbokki pan", root, new Vector3(.75f, 1.18f, -.3f), new Vector3(.64f, .05f, .64f), iron);
            Shape(PrimitiveType.Cylinder, "Oden pot", root, new Vector3(1.38f, 1.25f, -.3f), new Vector3(.56f, .13f, .56f), iron);
            Box("Takoyaki plate", root, new Vector3(1.05f, 1.15f, .45f), new Vector3(.6f, .05f, .4f), iron);
            Box("Fish display tray", root, new Vector3(-.6f, 1.15f, .55f), new Vector3(.9f, .04f, .4f), top);
            foreach (float dx in new[] { -.9f, .9f })
                Shape(PrimitiveType.Cylinder, "Stool", root, new Vector3(dx, .25f, 1.5f), new Vector3(.38f, .22f, .38f), stool, true);
            // 호객 지점 표시: 입간판
            Box("A-board", root, new Vector3(-3.2f, .5f, 1.6f), new Vector3(.6f, .9f, .08f), Mat("ABoard", new Color(.9f, .9f, .86f), 0f, .3f), true, new Vector3(-12f, 20f, 0f));

            return new[]
            {
                Point("붕어빵 틀", InteractionKind.Mold, root, new Vector3(-.75f, 0f, -1.35f)),
                Point("카운터", InteractionKind.Counter, root, new Vector3(.85f, 0f, -1.35f)),
                Point("호객", InteractionKind.Hawk, root, new Vector3(-3.2f, 0f, 2.3f)),
            };
        }

        static InteractionPoint Point(string label, InteractionKind kind, Transform parent, Vector3 local)
        {
            var go = new GameObject("Interact: " + label);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = local;
            var trigger = go.AddComponent<SphereCollider>();
            trigger.radius = S.InteractRadius;
            trigger.isTrigger = true;
            var point = go.AddComponent<InteractionPoint>();
            point.Kind = kind;
            point.Label = label;
            return point;
        }

        // ---------- 사장님 · 카메라 · HUD ----------

        static PlayerController Owner(InteractionPoint[] points, GameRunner runner, out Renderer[] body, out InteractionFinder finder)
        {
            var go = new GameObject("Owner");
            go.transform.position = new Vector3(S.PlayerStartX, Walk + .02f, S.PlayerStartZ);
            var cc = go.AddComponent<CharacterController>();
            cc.height = S.PlayerHeight;
            cc.radius = S.PlayerRadius;
            cc.center = new Vector3(0f, S.PlayerHeight / 2f + .02f, 0f);
            cc.skinWidth = .02f;
            cc.stepOffset = .2f;
            cc.minMoveDistance = 0f; // 프레임이 빠르면 한 프레임 이동량이 기본값(1mm)보다 작아 이동이 무시된다
            var player = go.AddComponent<PlayerController>();
            player.MinX = S.WalkMinX; player.MaxX = S.WalkMaxX;
            player.MinZ = S.WalkMinZ; player.MaxZ = S.WalkMaxZ;
            var coat = Mat("OwnerCoat", new Color(.29f, .36f, .43f), 0f, .3f);
            var apron = Mat("OwnerApron", new Color(.85f, .82f, .77f), 0f, .3f);
            body = new[]
            {
                Shape(PrimitiveType.Capsule, "Body", go.transform, new Vector3(0f, .85f, 0f), new Vector3(.46f, .78f, .32f), coat).GetComponent<Renderer>(),
                Box("Apron", go.transform, new Vector3(0f, .8f, .15f), new Vector3(.36f, .5f, .03f), apron).GetComponent<Renderer>(),
                Shape(PrimitiveType.Sphere, "Head", go.transform, new Vector3(0f, 1.52f, 0f), Vector3.one * .27f, Mat("Skin", new Color(.86f, .68f, .53f), 0f, .35f)).GetComponent<Renderer>(),
                Shape(PrimitiveType.Sphere, "Cap", go.transform, new Vector3(0f, 1.6f, 0f), new Vector3(.29f, .14f, .29f), Mat("CapRed", new Color(.76f, .33f, .18f), 0f, .3f)).GetComponent<Renderer>(),
            };
            finder = go.AddComponent<InteractionFinder>();
            finder.Points = points;
            finder.Runner = runner;
            return player;
        }

        static void BuildCamera(PlayerController player, Renderer[] body)
        {
            var go = new GameObject("Main Camera");
            go.tag = "MainCamera";
            var camera = go.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.Skybox;
            camera.fieldOfView = 55f;
            camera.nearClipPlane = .1f;
            camera.farClipPlane = 600f;
            var data = camera.GetUniversalAdditionalCameraData();
            data.renderPostProcessing = true;
            data.antialiasing = AntialiasingMode.SubpixelMorphologicalAntiAliasing;
            go.AddComponent<AudioListener>();
            var rig = go.AddComponent<CameraRig>();
            rig.Target = player.transform;
            rig.Player = player;
            rig.BodyRenderers = body;
            CameraRig.ThirdPersonPose(player.transform.position, out Vector3 p, out Quaternion r);
            go.transform.SetPositionAndRotation(p, r);
        }

        static void Hud(GameRunner runner, InteractionFinder finder)
        {
            var canvasGo = new GameObject("HUD");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = .5f;
            Font font = GameFont();
            Text MakeText(string name, Vector2 anchor, Vector2 pivot, Vector2 offset, TextAnchor align, bool panelBack)
            {
                var panel = new GameObject(name + " panel");
                panel.transform.SetParent(canvasGo.transform, false);
                var rect = panel.AddComponent<RectTransform>();
                rect.anchorMin = rect.anchorMax = anchor; rect.pivot = pivot;
                rect.sizeDelta = new Vector2(620f, 54f); rect.anchoredPosition = offset;
                var image = panel.AddComponent<Image>();
                image.color = new Color(0f, 0f, 0f, panelBack ? .45f : 0f);
                image.raycastTarget = false;
                var go = new GameObject(name);
                go.transform.SetParent(panel.transform, false);
                var textRect = go.AddComponent<RectTransform>();
                textRect.anchorMin = Vector2.zero; textRect.anchorMax = Vector2.one;
                textRect.offsetMin = new Vector2(18f, 0f); textRect.offsetMax = new Vector2(-18f, 0f);
                var text = go.AddComponent<Text>();
                text.font = font; text.fontSize = 28; text.color = Color.white; text.alignment = align;
                text.raycastTarget = false;
                var outline = go.AddComponent<Outline>();
                outline.effectColor = new Color(0f, 0f, 0f, .85f);
                outline.effectDistance = new Vector2(2f, -2f);
                return text;
            }
            var hud = canvasGo.AddComponent<GameHud>();
            hud.Runner = runner;
            hud.Finder = finder;
            hud.Status = MakeText("Status", new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(24f, -24f), TextAnchor.MiddleLeft, true);
            hud.Prompt = MakeText("Prompt", new Vector2(.5f, 0f), new Vector2(.5f, 0f), new Vector2(0f, 40f), TextAnchor.MiddleCenter, false);
        }
    }
}
