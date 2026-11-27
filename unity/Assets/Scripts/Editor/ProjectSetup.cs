using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Unjungcheon.EditorTools
{
    // URP 에셋·렌더러·후처리 프로필을 만들고 그래픽·품질·플레이어 설정에 지정한다. 다시 실행해도 같은 결과다.
    public static class ProjectSetup
    {
        public const string AssetDir = "Assets/Generated";
        const string RendererPath = AssetDir + "/LocationRenderer.asset";
        const string PipelinePath = AssetDir + "/LocationPipeline.asset";
        const string VolumePath = AssetDir + "/NightVolume.asset";
        const string PostProcessDataPath = "Packages/com.unity.render-pipelines.universal/Runtime/Data/PostProcessData.asset";

        // 입력 처리: 2 = Both. Input System이 기본 경로이고, 레거시 Input Manager도 켜 둔다.
        // uGUI 기본 입력 모듈과 레거시 API를 쓰는 도구가 예외 없이 돌고, 두 IGameInput 구현이 실제 프로젝트에서 함께 컴파일된다.
        public const int ActiveInputHandlerBoth = 2;

        public static void Create()
        {
            EnsureFolder();
            var renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(RendererPath);
            if (renderer == null)
            {
                renderer = ScriptableObject.CreateInstance<UniversalRendererData>();
                AssetDatabase.CreateAsset(renderer, RendererPath);
            }
            renderer.renderingMode = RenderingMode.ForwardPlus; // 가로등·창 조명 수에 물체당 조명 제한이 걸리지 않게
            if (renderer.postProcessData == null)
                renderer.postProcessData = AssetDatabase.LoadAssetAtPath<PostProcessData>(PostProcessDataPath);
            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath);
            if (pipeline == null)
            {
                pipeline = UniversalRenderPipelineAsset.Create(renderer);
                AssetDatabase.CreateAsset(pipeline, PipelinePath);
            }
            pipeline.supportsHDR = true;
            pipeline.msaaSampleCount = 4;
            pipeline.shadowDistance = 90f;
            pipeline.supportsCameraDepthTexture = true;
            GraphicsSettings.defaultRenderPipeline = pipeline;
            for (int i = 0; i < QualitySettings.names.Length; i++)
            {
                QualitySettings.SetQualityLevel(i, false);
                QualitySettings.renderPipeline = pipeline;
            }
            QualitySettings.SetQualityLevel(QualitySettings.names.Length - 1, false);
            if (PlayerSettings.colorSpace != ColorSpace.Linear) PlayerSettings.colorSpace = ColorSpace.Linear;
            SetInputHandler();
            EditorUtility.SetDirty(renderer);
            EditorUtility.SetDirty(pipeline);
            AssetDatabase.SaveAssets();
        }

        static void SetInputHandler()
        {
            Object[] settings = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset");
            if (settings.Length == 0) return;
            var so = new SerializedObject(settings[0]);
            SerializedProperty handler = so.FindProperty("activeInputHandler");
            if (handler == null || handler.intValue == ActiveInputHandlerBoth) return;
            handler.intValue = ActiveInputHandlerBoth;
            so.ApplyModifiedPropertiesWithoutUndo();
            Debug.LogWarning("activeInputHandler를 Both(2)로 바꿨다. 스크립트 정의가 바뀌므로 에디터를 다시 열어야 적용된다.");
        }

        static void EnsureFolder()
        {
            if (!AssetDatabase.IsValidFolder(AssetDir)) AssetDatabase.CreateFolder("Assets", "Generated");
        }

        // 밤 후처리: ACES 톤매핑, 블룸, 약한 비네팅.
        public static VolumeProfile NightProfile()
        {
            EnsureFolder();
            var profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(VolumePath);
            if (profile == null)
            {
                profile = ScriptableObject.CreateInstance<VolumeProfile>();
                AssetDatabase.CreateAsset(profile, VolumePath);
            }
            Tonemapping tone = Component<Tonemapping>(profile);
            tone.mode.Override(TonemappingMode.ACES);
            Bloom bloom = Component<Bloom>(profile);
            bloom.intensity.Override(0.9f);
            bloom.threshold.Override(0.95f);
            bloom.scatter.Override(0.65f);
            Vignette vignette = Component<Vignette>(profile);
            vignette.intensity.Override(0.22f);
            vignette.smoothness.Override(0.5f);
            ColorAdjustments color = Component<ColorAdjustments>(profile);
            color.postExposure.Override(0.35f);
            EditorUtility.SetDirty(profile);
            AssetDatabase.SaveAssets();
            return profile;
        }

        static T Component<T>(VolumeProfile profile) where T : VolumeComponent
        {
            if (!profile.TryGet(out T component))
            {
                component = profile.Add<T>(false);
                component.name = typeof(T).Name;
                AssetDatabase.AddObjectToAsset(component, profile);
            }
            component.active = true;
            return component;
        }
    }
}
