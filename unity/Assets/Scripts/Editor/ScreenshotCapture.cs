using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Unjungcheon.Game;
using S = Unjungcheon.EditorTools.CampusSpec;

namespace Unjungcheon.EditorTools
{
    // 생성된 씬을 지정한 카메라 자세로 1920x1080 PNG 4장에 담는다.
    public static class ScreenshotCapture
    {
        public const string OutputDir = "Build/Screenshots";
        public const int Width = 1920, Height = 1080;

        public static string[] Capture()
        {
            ShaderUtil.allowAsyncCompilation = false; // 셰이더가 다 컴파일된 뒤에 찍는다(청록색 자리표시 방지)
            EditorSceneManager.OpenScene(SceneBuilder.ScenePath);
            Directory.CreateDirectory(OutputDir);
            Camera camera = Camera.main;
            var canvas = Object.FindAnyObjectByType<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = camera;
            canvas.planeDistance = 1f;
            var rig = camera.GetComponent<CameraRig>();
            Vector3 owner = rig.Target.position;
            var hud = Object.FindAnyObjectByType<GameHud>();
            hud.Status.text = "1일째   남은 시간 2:10   12,400원";

            CameraRig.ThirdPersonPose(owner, out Vector3 p, out Quaternion r);
            string third = Save(camera, "third-person.png", p, r, 55f);

            rig.SetFirstPerson(true);
            CameraRig.FirstPersonPose(owner, 0f, 6f, out p, out r);
            string first = Save(camera, "first-person.png", p, r, 70f);
            rig.SetFirstPerson(false);

            p = new Vector3(S.MainX - 6f, 6f, S.NearWalkBackZ - 18f);
            r = Quaternion.LookRotation(new Vector3(S.MainX - 4f, 21f, S.MainFrontZ) - p);
            string front = Save(camera, "campus-front.png", p, r, 60f);
            var toast = Object.FindAnyObjectByType<Toast>();
            toast.Message.text = "SKALA 구성원이 아니라 들어갈 수 없습니다!";
            toast.Message.transform.parent.gameObject.SetActive(true);
            p = new Vector3(1.75f, 2f, 25f);
            r = Quaternion.LookRotation(new Vector3(1.75f, 2.5f, S.MainFrontZ + 1f) - p);
            string refusal = Save(camera, "entrance-refusal.png", p, r, 70f);
            toast.Message.transform.parent.gameObject.SetActive(false);
            var mold = Object.FindAnyObjectByType<FishMoldView>();
            rig.SetFirstPerson(true);
            hud.MoldPanel.SetActive(true);
            hud.MoldStep.text = "팥 넣기 · E 꾹";
            hud.MoldFill.anchorMax = new Vector2(.8f, 1f);
            hud.MoldTarget.anchorMin = new Vector2(.7f, 0f);
            hud.MoldTarget.anchorMax = new Vector2(.9f, 1f);
            mold.Lid.localRotation = Quaternion.Euler(-65f, 0f, 0f);
            mold.Filling.gameObject.SetActive(true);
            // 편집기 캡처에서는 Update가 돌지 않으므로 단체 주문 진행 화면(카드·상자)을 직접 채운다.
            var groupPanel = hud.Group.transform.parent.gameObject;
            hud.Group.text = "상자 3/8 · 52초 · 직접 구운 붕어빵만 담깁니다 · F 재고 이동";
            groupPanel.SetActive(true);
            var orderBox = Object.FindAnyObjectByType<GroupOrderBoxView>();
            orderBox.Visual.SetActive(true);
            for (int i = 0; i < orderBox.Fish.Length; i++) orderBox.Fish[i].SetActive(i < 3);
            p = mold.transform.position + new Vector3(0f, .4f, -2f);
            r = Quaternion.LookRotation(mold.transform.position + Vector3.up * .2f - p);
            string cooking = Save(camera, "fish-cooking.png", p, r, 65f);
            Pedestrian employee = null, trainee = null;
            foreach (var person in Object.FindObjectsByType<Pedestrian>(FindObjectsSortMode.None))
            {
                if (person.Kind == Unjungcheon.Core.CustomerKind.Employee && employee == null) employee = person;
                if (person.Kind == Unjungcheon.Core.CustomerKind.Trainee && trainee == null) trainee = person;
            }
            Vector3 employeePos = employee.transform.position, traineePos = trainee.transform.position;
            Quaternion employeeRot = employee.transform.rotation, traineeRot = trainee.transform.rotation;
            employee.transform.SetPositionAndRotation(new Vector3(-2f, employeePos.y, -5f), Quaternion.Euler(0f, 180f, 0f));
            trainee.transform.SetPositionAndRotation(new Vector3(-.9f, traineePos.y, -5f), Quaternion.Euler(0f, 180f, 0f));
            employee.GetComponent<PedestrianVisual>().TypeIcon.gameObject.SetActive(true);
            trainee.GetComponent<PedestrianVisual>().TypeIcon.gameObject.SetActive(true);
            p = new Vector3(-1.45f, 2.1f, -8.3f);
            r = Quaternion.LookRotation(new Vector3(-1.45f, 1.45f, -5f) - p);
            employee.GetComponent<PedestrianVisual>().TypeIcon.rotation = r;
            trainee.GetComponent<PedestrianVisual>().TypeIcon.rotation = r;
            hud.MoldPanel.SetActive(false);
            groupPanel.SetActive(false);
            orderBox.Visual.SetActive(false);
            string badges = Save(camera, "badge-comparison.png", p, r, 55f);
            employee.transform.SetPositionAndRotation(employeePos, employeeRot);
            trainee.transform.SetPositionAndRotation(traineePos, traineeRot);
            rig.SetFirstPerson(false);
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            return new[] { third, first, front, refusal, cooking, badges };
        }

        static string Save(Camera camera, string file, Vector3 position, Quaternion rotation, float fov)
        {
            string path = Path.GetFullPath(Path.Combine(OutputDir, file));
            camera.transform.SetPositionAndRotation(position, rotation);
            camera.fieldOfView = fov;
            var texture = new RenderTexture(Width, Height, 24, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB) { antiAliasing = 4 };
            var image = new Texture2D(Width, Height, TextureFormat.RGB24, false);
            RenderTexture previous = RenderTexture.active;
            camera.targetTexture = texture;
            camera.Render();
            camera.Render(); // 첫 프레임의 시간 의존 효과(노출·TAA 등)가 안정된 뒤 저장
            RenderTexture.active = texture;
            image.ReadPixels(new Rect(0, 0, Width, Height), 0, 0);
            image.Apply();
            File.WriteAllBytes(path, image.EncodeToPNG());
            camera.targetTexture = null;
            RenderTexture.active = previous;
            Object.DestroyImmediate(image);
            texture.Release();
            Object.DestroyImmediate(texture);
            Debug.Log("Screenshot: " + path);
            return path;
        }
    }
}
