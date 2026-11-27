using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Unjungcheon.Game;
using S = Unjungcheon.EditorTools.CampusSpec;

namespace Unjungcheon.EditorTools
{
    // 생성된 씬을 지정한 카메라 자세로 1920x1080 PNG 3장에 담는다: 3인칭, 1인칭, 캠퍼스 정면.
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
            var rig = camera.GetComponent<CameraRig>();
            Vector3 owner = rig.Target.position;

            CameraRig.ThirdPersonPose(owner, out Vector3 p, out Quaternion r);
            string third = Save(camera, "third-person.png", p, r, 55f);

            rig.SetFirstPerson(true);
            CameraRig.FirstPersonPose(owner, 0f, 6f, out p, out r);
            string first = Save(camera, "first-person.png", p, r, 70f);
            rig.SetFirstPerson(false);

            p = new Vector3(S.MainX - 6f, 6f, S.NearWalkBackZ - 18f);
            r = Quaternion.LookRotation(new Vector3(S.MainX - 4f, 21f, S.MainFrontZ) - p);
            string front = Save(camera, "campus-front.png", p, r, 60f);
            return new[] { third, first, front };
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
